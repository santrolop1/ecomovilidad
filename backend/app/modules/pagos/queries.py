"""Consultas de pagos y facturas (sin dependencias de pedidos ni alquileres)."""

import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Invoice, Payment
from app.models.enums import PaymentStatus
from app.modules.pagos.schemas import InvoiceRefOut, PaymentSummaryOut


@dataclass
class PaymentInfo:
    payment: PaymentSummaryOut | None
    invoice: InvoiceRefOut | None


def payment_summary(payment: Payment) -> PaymentSummaryOut:
    return PaymentSummaryOut(
        status=payment.status,
        reference=payment.reference,
        payment_method_type=payment.payment_method_type,
        status_message=payment.status_message,
        approved_at=payment.approved_at,
    )


def invoice_ref(invoice: Invoice) -> InvoiceRefOut:
    return InvoiceRefOut(id=invoice.id, number=invoice.full_number, issued_at=invoice.issued_at)


def payment_info(
    db: Session, *, order_ids: list[uuid.UUID] | None = None, rental_ids: list[uuid.UUID] | None = None
) -> dict[uuid.UUID, PaymentInfo]:
    """Último pago (el aprobado si lo hay) y factura de cada pedido o alquiler."""
    info: dict[uuid.UUID, PaymentInfo] = {}
    if not order_ids and not rental_ids:
        return info
    column, ids = (Payment.order_id, order_ids) if order_ids else (Payment.rental_id, rental_ids or [])
    payments = db.scalars(select(Payment).where(column.in_(ids)).order_by(Payment.created_at))
    for payment in payments:
        key = payment.order_id or payment.rental_id
        current = info.get(key)
        # El aprobado manda; si no hay, el más reciente.
        if current is None or current.payment is None or current.payment.status != PaymentStatus.APPROVED:
            info[key] = PaymentInfo(payment_summary(payment), None)
    invoice_column = Invoice.order_id if order_ids else Invoice.rental_id
    for invoice in db.scalars(select(Invoice).where(invoice_column.in_(ids))):
        key = invoice.order_id or invoice.rental_id
        info.setdefault(key, PaymentInfo(None, None)).invoice = invoice_ref(invoice)
    return info
