import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Inventory, Product
from app.repositories import admin as repo
from app.schemas.admin import InventoryRowOut, Page

from .catalog import inventory_row
from .common import PAGE_SIZE

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
