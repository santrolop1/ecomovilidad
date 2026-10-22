import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Branch, Category, Inventory, Product


def list_active_branches(db: Session) -> list[Branch]:
    return list(db.scalars(select(Branch).where(Branch.is_active).order_by(Branch.city, Branch.name)))


def get_active_branch(db: Session, branch_id: uuid.UUID) -> Branch | None:
    return db.scalars(select(Branch).where(Branch.id == branch_id, Branch.is_active)).one_or_none()


def availability_by_category(db: Session) -> dict[uuid.UUID, dict[str, int]]:
    """Unidades disponibles por sucursal y categoría (una sola consulta agregada)."""
    stmt = (
        select(Inventory.branch_id, Category.slug, func.sum(Inventory.available_quantity))
        .join(Product, Product.id == Inventory.product_id)
        .join(Category, Category.id == Product.category_id)
        .where(Product.is_active)
        .group_by(Inventory.branch_id, Category.slug)
    )
    result: dict[uuid.UUID, dict[str, int]] = {}
    for branch_id, category, available in db.execute(stmt):
        result.setdefault(branch_id, {})[category] = int(available)
    return result


def inventory_updated_at(db: Session) -> dict[uuid.UUID, datetime]:
    stmt = select(Inventory.branch_id, func.max(Inventory.updated_at)).group_by(Inventory.branch_id)
    return {branch_id: updated for branch_id, updated in db.execute(stmt)}
