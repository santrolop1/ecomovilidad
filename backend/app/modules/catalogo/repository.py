import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Category, Inventory, Product


def list_categories(db: Session) -> list[Category]:
    return list(db.scalars(select(Category).order_by(Category.name)))


def list_active_products(db: Session) -> list[Product]:
    """Productos activos con su categoría e inventario (dos consultas, sin N+1)."""
    stmt = select(Product).where(Product.is_active).options(selectinload(Product.inventory)).order_by(Product.name)
    return list(db.scalars(stmt).unique())


def get_product_by_slug(db: Session, slug: str) -> Product | None:
    stmt = select(Product).where(Product.slug == slug, Product.is_active).options(selectinload(Product.inventory))
    return db.scalars(stmt).unique().one_or_none()


def get_product(db: Session, product_id: uuid.UUID) -> Product | None:
    return db.scalars(select(Product).where(Product.id == product_id, Product.is_active)).unique().one_or_none()


def get_products(db: Session, product_ids: list[uuid.UUID]) -> dict[uuid.UUID, Product]:
    stmt = (
        select(Product).where(Product.id.in_(product_ids), Product.is_active).options(selectinload(Product.inventory))
    )
    return {p.id: p for p in db.scalars(stmt).unique()}


def list_product_inventory(db: Session, product_id: uuid.UUID) -> list[Inventory]:
    stmt = select(Inventory).where(Inventory.product_id == product_id).order_by(Inventory.branch_id)
    return list(db.scalars(stmt).unique())
