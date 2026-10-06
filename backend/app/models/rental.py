from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey

from .enums import RentalStatus, sql_in

if TYPE_CHECKING:
    from .branch import Branch
    from .catalog import Product


class Rental(UUIDPrimaryKey, Timestamps, Base):
    """Reserva de alquiler de un producto en una sucursal.

    Sin GPS ni cálculo de disponibilidad por franjas en esta fase.
    """

    __tablename__ = "rentals"
    __table_args__ = (
        CheckConstraint(f"status IN {sql_in(RentalStatus)}", name="valid_status"),
        CheckConstraint("end_at > start_at", name="end_after_start"),
        CheckConstraint("price >= 0", name="price_non_negative"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"))
    branch_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("branches.id", ondelete="RESTRICT"))
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default=RentalStatus.PENDING, server_default=RentalStatus.PENDING)
    price: Mapped[int] = mapped_column(BigInteger)

    product: Mapped[Product] = relationship(lazy="joined")
    branch: Mapped[Branch] = relationship(lazy="joined")
