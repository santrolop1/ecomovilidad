from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Computed, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import TSTZRANGE, ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey

from .enums import RentalRateUnit, RentalStatus, RentalUnitStatus, sql_in

if TYPE_CHECKING:
    from .branch import Branch
    from .catalog import Product

# Estados en los que el alquiler ocupa su unidad (la apartan del calendario).
HOLDING_STATUSES = (RentalStatus.PENDING, RentalStatus.CONFIRMED, RentalStatus.ACTIVE)


class RentalRate(UUIDPrimaryKey, Base):
    """Tarifa de alquiler de un producto. Un producto se alquila si tiene tarifas."""

    __tablename__ = "rental_rates"
    __table_args__ = (
        UniqueConstraint("product_id", "unit", name="uq_rental_rates_product_unit"),
        CheckConstraint(f"unit IN {sql_in(RentalRateUnit)}", name="valid_unit"),
        CheckConstraint("price > 0", name="price_positive"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    unit: Mapped[str] = mapped_column(String(10))
    price: Mapped[int] = mapped_column(BigInteger)


class RentalUnit(UUIDPrimaryKey, Timestamps, Base):
    """Unidad física de la flota de alquiler (separada del inventario de venta)."""

    __tablename__ = "rental_units"
    __table_args__ = (CheckConstraint(f"status IN {sql_in(RentalUnitStatus)}", name="valid_status"),)

    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    branch_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("branches.id", ondelete="RESTRICT"), index=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    status: Mapped[str] = mapped_column(
        String(20), default=RentalUnitStatus.OPERATIONAL, server_default=RentalUnitStatus.OPERATIONAL
    )
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    product: Mapped[Product] = relationship(lazy="joined")
    branch: Mapped[Branch] = relationship(lazy="joined")


class Rental(UUIDPrimaryKey, Timestamps, Base):
    """Alquiler de una unidad de la flota en una sucursal.

    La restricción de exclusión impide, en la propia base de datos, que una
    unidad tenga dos alquileres vigentes que se crucen en el tiempo (aunque dos
    solicitudes lleguen a la vez).
    """

    __tablename__ = "rentals"
    __table_args__ = (
        CheckConstraint(f"status IN {sql_in(RentalStatus)}", name="valid_status"),
        CheckConstraint("end_at > start_at", name="end_after_start"),
        CheckConstraint("price >= 0", name="price_non_negative"),
        ExcludeConstraint(
            ("rental_unit_id", "="),
            ("period", "&&"),
            using="gist",
            where=f"status IN {sql_in(HOLDING_STATUSES)}",
            name="rentals_no_overlap",
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"))
    branch_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("branches.id", ondelete="RESTRICT"))
    # Nulo solo en alquileres anteriores a la flota (migración 0004).
    rental_unit_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("rental_units.id", ondelete="RESTRICT"))
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    period: Mapped[object] = mapped_column(
        TSTZRANGE, Computed("tstzrange(start_at, GREATEST(start_at, end_at), '[)')", persisted=True)
    )
    status: Mapped[str] = mapped_column(String(20), default=RentalStatus.PENDING, server_default=RentalStatus.PENDING)
    price: Mapped[int] = mapped_column(BigInteger)
    # Plazo para pagar; vencido sin pago, el alquiler se cancela y la unidad queda libre.
    payment_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Datos del cliente en el momento de la reserva (los requiere la factura).
    contact_name: Mapped[str | None] = mapped_column(String(160))
    contact_email: Mapped[str | None] = mapped_column(String(254))
    contact_phone: Mapped[str | None] = mapped_column(String(20))
    document_type: Mapped[str | None] = mapped_column(String(3))
    document_number: Mapped[str | None] = mapped_column(String(20))

    product: Mapped[Product] = relationship(lazy="joined")
    branch: Mapped[Branch] = relationship(lazy="joined")
    unit: Mapped[RentalUnit | None] = relationship(lazy="joined")
