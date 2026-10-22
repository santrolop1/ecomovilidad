from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.modules.carrito.models import CartItem
    from app.modules.inventario.models import Inventory

RESERVATION_MINUTES = 15


class CartReservation(UUIDPrimaryKey, Base):
    """Unidades apartadas temporalmente para una línea de carrito (RF 6.2).

    Las unidades también suman en `inventory.reserved_quantity`, así toda la
    disponibilidad (tienda, panel, pedidos) las descuenta automáticamente.
    Invariante: la cantidad de la línea = suma de sus reservas.
    """

    __tablename__ = "cart_reservations"
    __table_args__ = (
        UniqueConstraint("cart_item_id", "inventory_id", name="uq_cart_reservations_item_inventory"),
        CheckConstraint("quantity > 0", name="quantity_positive"),
    )

    cart_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cart_items.id", ondelete="CASCADE"), index=True)
    # RESTRICT: no se puede borrar inventario con unidades apartadas.
    inventory_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("inventory.id", ondelete="RESTRICT"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    cart_item: Mapped[CartItem] = relationship(back_populates="reservations")
    inventory: Mapped[Inventory] = relationship()
