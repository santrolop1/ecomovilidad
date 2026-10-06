import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Cart, CartItem, Product
from app.models.enums import CartStatus


def get_active_cart(db: Session, user_id: uuid.UUID, *, for_update: bool = False) -> Cart | None:
    stmt = (
        select(Cart)
        .where(Cart.user_id == user_id, Cart.status == CartStatus.ACTIVE)
        .options(selectinload(Cart.items).joinedload(CartItem.product).selectinload(Product.inventory))
    )
    if for_update:
        stmt = stmt.with_for_update(of=Cart)
    return db.scalars(stmt).unique().one_or_none()
