from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    LargeBinary,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPrimaryKey
from app.models.enums import PaymentStatus, sql_in

PAYMENT_TARGET = "(order_id IS NOT NULL) <> (rental_id IS NOT NULL)"


class Payment(UUIDPrimaryKey, Timestamps, Base):
    """Un intento de pago en la pasarela (Wompi) de un pedido o un alquiler.

    Un pedido puede tener varios intentos (rechazado y vuelto a intentar), pero
    como máximo uno aprobado. El estado solo cambia con datos verificados de la
    pasarela: consulta servidor a servidor o evento con firma válida.
    """

    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint(f"status IN {sql_in(PaymentStatus)}", name="valid_status"),
        CheckConstraint(PAYMENT_TARGET, name="one_target"),
        CheckConstraint("amount_in_cents > 0", name="amount_positive"),
        Index(
            "uq_payments_order_approved",
            "order_id",
            unique=True,
            postgresql_where=text("status = 'approved' AND NOT requires_refund"),
        ),
        Index(
            "uq_payments_rental_approved",
            "rental_id",
            unique=True,
            postgresql_where=text("status = 'approved' AND NOT requires_refund"),
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("orders.id", ondelete="RESTRICT"), index=True)
    rental_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("rentals.id", ondelete="RESTRICT"), index=True)
    provider: Mapped[str] = mapped_column(String(20), default="wompi", server_default="wompi")
    # Referencia única enviada a la pasarela; con ella se identifica el pago en los eventos.
    reference: Mapped[str] = mapped_column(String(64), unique=True)
    amount_in_cents: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3), default="COP", server_default="COP")
    status: Mapped[str] = mapped_column(String(20), default=PaymentStatus.PENDING, server_default=PaymentStatus.PENDING)
    provider_transaction_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    payment_method_type: Mapped[str | None] = mapped_column(String(40))
    status_message: Mapped[str | None] = mapped_column(String(255))
    # Pago aprobado que no se pudo aplicar (pedido ya vencido o pagado dos veces): requiere reembolso.
    requires_refund: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PaymentEvent(UUIDPrimaryKey, Base):
    """Eventos recibidos de la pasarela (auditoría e idempotencia: el mismo
    evento reenviado tiene la misma firma y se procesa una sola vez)."""

    __tablename__ = "payment_events"

    checksum: Mapped[str] = mapped_column(String(64), unique=True)
    event: Mapped[str] = mapped_column(String(60))
    transaction_id: Mapped[str | None] = mapped_column(String(64), index=True)
    status: Mapped[str | None] = mapped_column(String(20))
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Invoice(UUIDPrimaryKey, Base):
    """Factura de venta emitida al aprobarse un pago. Inmutable: guarda los
    datos del comprador y el PDF y XML generados en el momento de emitirla.

    No es una factura electrónica validada por la DIAN (falta la resolución de
    facturación y el proveedor tecnológico); el documento lo indica.
    """

    __tablename__ = "invoices"
    __table_args__ = (
        CheckConstraint(PAYMENT_TARGET, name="one_target"),
        CheckConstraint("total = subtotal + vat", name="total_consistent"),
    )

    number: Mapped[int] = mapped_column(BigInteger, unique=True)
    prefix: Mapped[str] = mapped_column(String(10))
    payment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("payments.id", ondelete="RESTRICT"), unique=True)
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("orders.id", ondelete="RESTRICT"), unique=True)
    rental_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("rentals.id", ondelete="RESTRICT"), unique=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    buyer_name: Mapped[str] = mapped_column(String(160))
    buyer_document_type: Mapped[str] = mapped_column(String(3))
    buyer_document_number: Mapped[str] = mapped_column(String(20))
    buyer_email: Mapped[str] = mapped_column(String(254))
    subtotal: Mapped[int] = mapped_column(BigInteger)
    vat: Mapped[int] = mapped_column(BigInteger)
    total: Mapped[int] = mapped_column(BigInteger)
    pdf: Mapped[bytes] = mapped_column(LargeBinary)
    xml: Mapped[str] = mapped_column(Text)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    @property
    def full_number(self) -> str:
        return f"{self.prefix}-{self.number:06d}"


class RefundRequest(UUIDPrimaryKey, Base):
    """Solicitud de reembolso de un pedido o alquiler pagado (CU-15).

    El reembolso del dinero se hace en la pasarela; aquí queda la trazabilidad:
    quién lo pidió, por qué, y cuándo el panel lo registró como reembolsado.
    """

    __tablename__ = "refund_requests"
    __table_args__ = (
        CheckConstraint(PAYMENT_TARGET, name="one_target"),
        CheckConstraint("status IN ('abierta', 'reembolsada')", name="valid_status"),
        Index("uq_refund_requests_order_open", "order_id", unique=True, postgresql_where=text("status = 'abierta'")),
        Index("uq_refund_requests_rental_open", "rental_id", unique=True, postgresql_where=text("status = 'abierta'")),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("orders.id", ondelete="RESTRICT"), index=True)
    rental_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("rentals.id", ondelete="RESTRICT"), index=True)
    reason: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default="abierta", server_default="abierta")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
