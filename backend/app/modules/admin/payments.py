import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Payment
from app.models.enums import PaymentStatus
from app.modules.admin.schemas import AdminPaymentOut, AdminRefundAlertOut


def to_admin_payment(payment: Payment) -> AdminPaymentOut:
    return AdminPaymentOut(
        status=payment.status,
        reference=payment.reference,
        provider=payment.provider,
        provider_transaction_id=payment.provider_transaction_id,
        payment_method_type=payment.payment_method_type,
        status_message=payment.status_message,
        approved_at=payment.approved_at,
        requires_refund=payment.requires_refund,
        created_at=payment.created_at,
    )


def payments_for(db: Session, *, order_id: uuid.UUID | None = None, rental_id: uuid.UUID | None = None):
    column, value = (Payment.order_id, order_id) if order_id else (Payment.rental_id, rental_id)
    return [
        to_admin_payment(p) for p in db.scalars(select(Payment).where(column == value).order_by(Payment.created_at))
    ]


def refund_alerts(db: Session) -> list[AdminRefundAlertOut]:
    """Pagos aprobados que no se aplicaron (pedido vencido o pagado dos veces)."""
    stmt = (
        select(Payment)
        .where(Payment.requires_refund, Payment.status == PaymentStatus.APPROVED)
        .order_by(Payment.approved_at.desc())
    )
    return [
        AdminRefundAlertOut(
            reference=p.reference,
            amount=p.amount_in_cents // 100,
            order_id=p.order_id,
            rental_id=p.rental_id,
            approved_at=p.approved_at,
        )
        for p in db.scalars(stmt)
    ]
