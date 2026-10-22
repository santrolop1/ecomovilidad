import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Inventory, Order


def list_user_orders(db: Session, user_id: uuid.UUID) -> list[Order]:
    stmt = (
        select(Order)
        .where(Order.user_id == user_id)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    return list(db.scalars(stmt).unique())


def get_user_order(db: Session, user_id: uuid.UUID, order_id: uuid.UUID) -> Order | None:
    stmt = select(Order).where(Order.id == order_id, Order.user_id == user_id).options(selectinload(Order.items))
    return db.scalars(stmt).unique().one_or_none()


def lock_inventory(db: Session, product_ids: list[uuid.UUID]) -> list[Inventory]:
    """Bloquea las filas de inventario (SELECT ... FOR UPDATE) en orden estable
    para evitar sobreventa e interbloqueos entre pedidos simultáneos."""
    stmt = (
        select(Inventory)
        .where(Inventory.product_id.in_(product_ids))
        .order_by(Inventory.product_id, Inventory.branch_id)
        .with_for_update(of=Inventory)
    )
    return list(db.scalars(stmt).unique())
