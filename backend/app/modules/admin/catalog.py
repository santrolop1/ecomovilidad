import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, ServiceError
from app.models import Branch, Category, Inventory, Product
from app.models.enums import MovementKind
from app.modules.admin import repository as repo
from app.modules.admin.common import PAGE_SIZE, commit_or_conflict
from app.modules.admin.schemas import (
    AdminCategoryOut,
    AdminProductDetailOut,
    AdminProductOut,
    CategoryIn,
    CategoryRef,
    CategoryUpdateIn,
    InventoryRowOut,
    Page,
    ProductCreateIn,
    ProductUpdateIn,
    SpecIn,
)
from app.modules.inventario.movements import record_movement


def _product_out(product: Product, stock: tuple[int, int, int]) -> AdminProductOut:
    available, reserved, total = stock
    return AdminProductOut(
        id=product.id,
        slug=product.slug,
        sku=product.sku,
        name=product.name,
        brand=product.brand,
        category=CategoryRef(id=product.category.id, slug=product.category.slug, name=product.category.name),
        short_description=product.short_description,
        description=product.description,
        price=product.price,
        compare_at_price=product.compare_at_price,
        specifications=[SpecIn.model_validate(s) for s in product.specifications],
        highlights=list(product.highlights),
        image_url=product.image_url,
        is_featured=product.is_featured,
        is_active=product.is_active,
        available=available,
        reserved=reserved,
        total=total,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


def inventory_row(inv: Inventory, sold: dict) -> InventoryRowOut:
    return InventoryRowOut(
        id=inv.id,
        product_id=inv.product_id,
        product_name=inv.product.name,
        product_slug=inv.product.slug,
        sku=inv.product.sku,
        branch_id=inv.branch_id,
        branch_name=inv.branch.name,
        city=inv.branch.city,
        available=inv.available_quantity,
        reserved=inv.reserved_quantity,
        total=inv.total_quantity,
        sold=sold.get((inv.product_id, inv.branch_id), 0),
        updated_at=inv.updated_at,
    )


def list_products(
    db: Session,
    *,
    page: int,
    query: str | None,
    category: str | None,
    status: str | None,
    featured: bool | None,
) -> Page[AdminProductOut]:
    stmt = select(Product).join(Category).order_by(Product.name)
    if query:
        like = f"%{query}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.sku.ilike(like), Product.brand.ilike(like)))
    if category:
        stmt = stmt.where(Category.slug == category)
    if status in ("active", "inactive"):
        stmt = stmt.where(Product.is_active.is_(status == "active"))
    if featured is not None:
        stmt = stmt.where(Product.is_featured.is_(featured))
    products, total = repo.paginate(db, stmt, page, PAGE_SIZE)
    stock = repo.stock_by_product(db, [p.id for p in products])
    return Page(
        items=[_product_out(p, stock.get(p.id, (0, 0, 0))) for p in products],
        total=total,
        page=page,
        page_size=PAGE_SIZE,
    )


def get_product(db: Session, product_id: uuid.UUID) -> AdminProductDetailOut:
    product = db.get(Product, product_id)
    if product is None:
        raise NotFoundError("El producto no existe.")
    sold = repo.sold_units(db)
    existing = {inv.branch_id: inv for inv in db.scalars(repo.inventory_rows_stmt(product_id=product_id)).unique()}
    rows = []
    # Todas las sucursales, también las que aún no tienen existencias de este producto.
    for branch in db.scalars(select(Branch).order_by(Branch.city, Branch.name)):
        inv = existing.get(branch.id)
        rows.append(
            inventory_row(inv, sold)
            if inv
            else InventoryRowOut(
                id=None,
                product_id=product.id,
                product_name=product.name,
                product_slug=product.slug,
                sku=product.sku,
                branch_id=branch.id,
                branch_name=branch.name,
                city=branch.city,
                available=0,
                reserved=0,
                total=0,
                sold=sold.get((product.id, branch.id), 0),
                updated_at=None,
            )
        )
    base = _product_out(product, repo.stock_by_product(db, [product.id]).get(product.id, (0, 0, 0)))
    return AdminProductDetailOut(**base.model_dump(), inventory=rows)


def _ensure_category(db: Session, category_id: uuid.UUID) -> None:
    if db.get(Category, category_id) is None:
        raise ServiceError("La categoría no existe.")


def create_product(db: Session, data: ProductCreateIn) -> AdminProductDetailOut:
    _ensure_category(db, data.category_id)
    product = Product(
        **data.model_dump(exclude={"specifications"}),
        specifications=[s.model_dump(exclude_none=True) for s in data.specifications],
    )
    db.add(product)
    commit_or_conflict(db)
    return get_product(db, product.id)


def update_product(db: Session, product_id: uuid.UUID, data: ProductUpdateIn) -> AdminProductDetailOut:
    product = db.get(Product, product_id)
    if product is None:
        raise NotFoundError("El producto no existe.")
    changes = data.model_dump(exclude_unset=True)
    if "category_id" in changes:
        if changes["category_id"] is None:
            raise ServiceError("La categoría es obligatoria.")
        _ensure_category(db, changes["category_id"])
    for field in (
        "name",
        "slug",
        "sku",
        "brand",
        "short_description",
        "description",
        "price",
        "is_featured",
        "is_active",
    ):
        if field in changes and changes[field] is None:
            raise ServiceError("Hay campos obligatorios vacíos.")
    if "specifications" in changes:
        changes["specifications"] = [s.model_dump(exclude_none=True) for s in data.specifications or []]
    for field, value in changes.items():
        setattr(product, field, value)
    if product.compare_at_price is not None and product.compare_at_price <= product.price:
        db.rollback()
        raise ServiceError("El precio anterior debe ser mayor que el precio actual.")
    commit_or_conflict(db)
    return get_product(db, product.id)


def set_stock(
    db: Session, product_id: uuid.UUID, branch_id: uuid.UUID, total_quantity: int, reason: str, user_id: uuid.UUID
) -> AdminProductDetailOut:
    """Fija las unidades físicas de un producto en una sucursal y registra el
    cambio. Las reservadas por pedidos no se tocan: disponible = total − reservado
    (nunca negativo)."""
    if db.get(Product, product_id) is None:
        raise NotFoundError("El producto no existe.")
    if db.get(Branch, branch_id) is None:
        raise NotFoundError("La sucursal no existe.")
    inv = (
        db.scalars(
            select(Inventory)
            .where(Inventory.product_id == product_id, Inventory.branch_id == branch_id)
            .with_for_update(of=Inventory)
        )
        .unique()
        .one_or_none()
    )
    if inv is None:
        previous = 0
        inv = Inventory(
            product_id=product_id,
            branch_id=branch_id,
            total_quantity=total_quantity,
            available_quantity=total_quantity,
            reserved_quantity=0,
        )
        db.add(inv)
    else:
        previous = inv.total_quantity
        if total_quantity < inv.reserved_quantity:
            raise ConflictError(
                f"No puedes dejar menos de {inv.reserved_quantity} unidades: están reservadas por pedidos."
            )
        inv.total_quantity = total_quantity
        inv.available_quantity = total_quantity - inv.reserved_quantity
    change = total_quantity - previous
    kind = MovementKind.IN if change > 0 else MovementKind.OUT
    record_movement(db, inv, kind, change, reason=reason, user_id=user_id)
    commit_or_conflict(db)
    return get_product(db, product_id)


def list_categories(db: Session) -> list[AdminCategoryOut]:
    counts = dict(db.execute(select(Product.category_id, func.count()).group_by(Product.category_id)).all())
    return [
        AdminCategoryOut(
            id=c.id, slug=c.slug, name=c.name, description=c.description, product_count=counts.get(c.id, 0)
        )
        for c in db.scalars(select(Category).order_by(Category.name))
    ]


def _category_out(db: Session, category: Category) -> AdminCategoryOut:
    count = repo.count_where(db, Product, Product.category_id == category.id)
    return AdminCategoryOut(
        id=category.id, slug=category.slug, name=category.name, description=category.description, product_count=count
    )


def create_category(db: Session, data: CategoryIn) -> AdminCategoryOut:
    category = Category(**data.model_dump())
    db.add(category)
    commit_or_conflict(db)
    return _category_out(db, category)


def update_category(db: Session, category_id: uuid.UUID, data: CategoryUpdateIn) -> AdminCategoryOut:
    category = db.get(Category, category_id)
    if category is None:
        raise NotFoundError("La categoría no existe.")
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None and field != "description":
            raise ServiceError("Hay campos obligatorios vacíos.")
        setattr(category, field, value if value is not None else "")
    commit_or_conflict(db)
    return _category_out(db, category)
