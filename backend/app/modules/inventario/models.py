from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.modules.autenticacion.models import User
    from app.modules.catalogo.models import Product
    from app.modules.sucursales.models import Branch


class Inventory(UUIDPrimaryKey, Base):
    """Existencias de un producto en una sucursal.

    total = unidades físicas; reserved = apartadas por pedidos pendientes;
    available = vendibles ahora. Siempre available + reserved <= total.
    """

    __tablename__ = "inventory"
    __table_args__ = (
        UniqueConstraint("product_id", "branch_id", name="uq_inventory_product_branch"),
        CheckConstraint("available_quantity >= 0", name="available_non_negative"),
        CheckConstraint("reserved_quantity >= 0", name="reserved_non_negative"),
        CheckConstraint("total_quantity >= 0", name="total_non_negative"),
        CheckConstraint("available_quantity + reserved_quantity <= total_quantity", name="quantities_consistent"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    branch_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("branches.id", ondelete="CASCADE"), index=True)
    available_quantity: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    reserved_quantity: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    total_quantity: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    product: Mapped[Product] = relationship(back_populates="inventory")
    branch: Mapped[Branch] = relationship(back_populates="inventory", lazy="joined")


class InventoryMovement(UUIDPrimaryKey, Base):
    """Registro de entradas y salidas de unidades físicas (CU-13).

    Solo se agregan filas; nunca se editan. La suma de `quantity` de una fila de
    inventario es su `total_quantity`. Las reservas no aparecen: apartan unidades,
    pero no las sacan de la sucursal.
    """

    __tablename__ = "inventory_movements"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('saldo_inicial', 'entrada', 'salida', 'venta', 'devolucion')",
            name="valid_kind",
        ),
        CheckConstraint("quantity <> 0", name="quantity_non_zero"),
        CheckConstraint("balance_after >= 0", name="balance_non_negative"),
    )

    inventory_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("inventory.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    quantity: Mapped[int] = mapped_column(Integer)  # con signo: + entra, − sale
    balance_after: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str | None] = mapped_column(String(200))
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("orders.id", ondelete="SET NULL"), index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    inventory: Mapped[Inventory] = relationship()
    user: Mapped[User | None] = relationship()
