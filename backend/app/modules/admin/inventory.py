import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Inventory, InventoryMovement, Product
from app.models.enums import MovementKind
from app.modules.admin import repository as repo
from app.modules.admin.catalog import inventory_row
from app.modules.admin.common import PAGE_SIZE
from app.modules.admin.schemas import InventoryMovementOut, InventoryRowOut, Page

LOW_STOCK_THRESHOLD = 5  # mismo umbral que "últimas unidades" en la tienda


def list_inventory(
    db: Session, *, page: int, query: str | None, branch_id: uuid.UUID | None, low_stock: bool
) -> Page[InventoryRowOut]:
    stmt = repo.inventory_rows_stmt(branch_id=branch_id, query=query).where(Product.is_active)
    if low_stock:
        stmt = stmt.where(Inventory.available_quantity <= LOW_STOCK_THRESHOLD)
    rows, total = repo.paginate(db, stmt, page, PAGE_SIZE)
    sold = repo.sold_units(db)
    return Page(items=[inventory_row(inv, sold) for inv in rows], total=total, page=page, page_size=PAGE_SIZE)


def movement_row(movement: InventoryMovement) -> InventoryMovementOut:
    inv = movement.inventory
    user = movement.user
    return InventoryMovementOut(
        id=movement.id,
        product_id=inv.product_id,
        product_name=inv.product.name,
        sku=inv.product.sku,
        branch_name=inv.branch.name,
        city=inv.branch.city,
        kind=MovementKind(movement.kind),
        quantity=movement.quantity,
        balance_after=movement.balance_after,
        reason=movement.reason,
        order_id=movement.order_id,
        user_name=f"{user.first_name} {user.last_name}" if user else None,
        created_at=movement.created_at,
    )


def list_movements(
    db: Session, *, page: int, query: str | None, branch_id: uuid.UUID | None, kind: MovementKind | None
) -> Page[InventoryMovementOut]:
    stmt = repo.inventory_movements_stmt(branch_id=branch_id, query=query, kind=kind)
    rows, total = repo.paginate(db, stmt, page, PAGE_SIZE)
    return Page(items=[movement_row(m) for m in rows], total=total, page=page, page_size=PAGE_SIZE)


def inventory_totals(db: Session) -> tuple[int, int, int]:
    row = db.execute(
        select(
            func.coalesce(func.sum(Inventory.available_quantity), 0),
            func.coalesce(func.sum(Inventory.reserved_quantity), 0),
            func.coalesce(func.sum(Inventory.total_quantity), 0),
        )
        .join(Product, Product.id == Inventory.product_id)
        .where(Product.is_active)
    ).one()
    return int(row[0]), int(row[1]), int(row[2])
