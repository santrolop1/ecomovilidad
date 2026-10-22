from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey
from app.models.enums import SERVICE_AREA_CITIES, FulfillmentMethod, OrderStatus, PaymentMethod, sql_in

if TYPE_CHECKING:
    from app.modules.autenticacion.models import User
    from app.modules.catalogo.models import Product
    from app.modules.sucursales.models import Branch


class Order(UUIDPrimaryKey, Timestamps, Base):
    """Pedido de compra. Los datos de contacto y entrega se guardan como
    copia del momento de la compra (también los requiere la factura)."""

    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(f"status IN {sql_in(OrderStatus)}", name="valid_status"),
        CheckConstraint(f"fulfillment_method IN {sql_in(FulfillmentMethod)}", name="valid_fulfillment"),
        CheckConstraint(
            f"payment_method IS NULL OR payment_method IN {sql_in(PaymentMethod)}", name="valid_payment_method"
        ),
        CheckConstraint("subtotal >= 0 AND shipping_cost >= 0", name="amounts_non_negative"),
        CheckConstraint("total = subtotal + shipping_cost", name="total_consistent"),
        CheckConstraint(
            f"fulfillment_method <> 'domicilio' OR "
            f"(delivery_address IS NOT NULL AND delivery_city IN {sql_in(SERVICE_AREA_CITIES)})",
            name="delivery_inside_service_area",
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    status: Mapped[str] = mapped_column(String(20), default=OrderStatus.PENDING, server_default=OrderStatus.PENDING)
    subtotal: Mapped[int] = mapped_column(BigInteger)
    shipping_cost: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0")
    total: Mapped[int] = mapped_column(BigInteger)

    # Sucursal que despacha o donde se recoge; el inventario se aparta allí.
    branch_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("branches.id", ondelete="RESTRICT"))
    fulfillment_method: Mapped[str] = mapped_column(String(20))
    delivery_address: Mapped[str | None] = mapped_column(String(160))
    delivery_city: Mapped[str | None] = mapped_column(String(40))
    scheduled_date: Mapped[date] = mapped_column(Date)
    time_slot: Mapped[str] = mapped_column(String(20))
    # Histórico: medio elegido en el checkout antes de los pagos en línea. Hoy el
    # cliente elige el medio en la pasarela y queda en `payments.payment_method_type`.
    payment_method: Mapped[str | None] = mapped_column(String(20))
    # Plazo para pagar; vencido sin pago, el pedido se cancela y libera el inventario.
    payment_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Momento en que las unidades salieron del inventario (al aprobarse el pago).
    stock_settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    contact_name: Mapped[str] = mapped_column(String(160))
    contact_email: Mapped[str] = mapped_column(String(254))
    contact_phone: Mapped[str] = mapped_column(String(20))
    document_type: Mapped[str] = mapped_column(String(3))
    document_number: Mapped[str] = mapped_column(String(20))

    items: Mapped[list[OrderItem]] = relationship(back_populates="order", cascade="all, delete-orphan")
    branch: Mapped[Branch] = relationship(lazy="joined")
    user: Mapped[User] = relationship()


class OrderItem(UUIDPrimaryKey, Base):
    __tablename__ = "order_items"
    __table_args__ = (
        UniqueConstraint("order_id", "product_id", name="uq_order_items_order_product"),
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("unit_price >= 0", name="unit_price_non_negative"),
        CheckConstraint("subtotal = quantity * unit_price", name="subtotal_consistent"),
    )

    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[int] = mapped_column(BigInteger)
    subtotal: Mapped[int] = mapped_column(BigInteger)

    order: Mapped[Order] = relationship(back_populates="items")
    product: Mapped[Product] = relationship(lazy="joined")
