from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Index, Integer, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey

from .enums import CartStatus, sql_in

MAX_QUANTITY_PER_ITEM = 10

if TYPE_CHECKING:
    from .catalog import Product
    from .reservation import CartReservation


class Cart(UUIDPrimaryKey, Timestamps, Base):
    """Carrito persistente del usuario: el mismo en todos sus dispositivos (RF 6.3)."""

    __tablename__ = "carts"
    __table_args__ = (
        CheckConstraint(f"status IN {sql_in(CartStatus)}", name="valid_status"),
        # Un único carrito activo por usuario.
        Index("uq_carts_one_active_per_user", "user_id", unique=True, postgresql_where=text("status = 'active'")),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), default=CartStatus.ACTIVE, server_default=CartStatus.ACTIVE)

    items: Mapped[list[CartItem]] = relationship(
        back_populates="cart", cascade="all, delete-orphan", order_by="CartItem.created_at"
    )


class CartItem(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint("cart_id", "product_id", name="uq_cart_items_cart_product"),
        CheckConstraint(f"quantity BETWEEN 1 AND {MAX_QUANTITY_PER_ITEM}", name="quantity_range"),
        CheckConstraint("unit_price >= 0", name="unit_price_non_negative"),
    )

    cart_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("carts.id", ondelete="CASCADE"))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    quantity: Mapped[int] = mapped_column(Integer)
    # Precio al momento de agregarlo; se actualiza si el catálogo cambia.
    unit_price: Mapped[int] = mapped_column(BigInteger)

    cart: Mapped[Cart] = relationship(back_populates="items")
    product: Mapped[Product] = relationship(lazy="joined")
    reservations: Mapped[list[CartReservation]] = relationship(
        back_populates="cart_item", cascade="all, delete-orphan", lazy="selectin"
    )
