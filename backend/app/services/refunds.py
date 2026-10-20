"""Cancelaciones y reembolsos (CU-15).

- Sin pagar: el cliente cancela y se libera lo apartado (inventario o unidad).
- Pagado y sin entregar: el cliente solicita el reembolso con un motivo. El
  panel lo registra cuando devolvió el dinero en la pasarela: el pedido o
  alquiler se cancela y las unidades vuelven al inventario.
- Pendiente: reembolso automático por la pasarela y nota crédito DIAN.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Order, Payment, RefundRequest, Rental, User
from app.models.enums import OrderStatus, PaymentStatus, RentalStatus
from app.schemas.refund import AdminRefundRequestOut, RefundRequestOut

from . import orders as order_service
from .errors import ConflictError, NotFoundError
from .reservations import now_utc

OPEN = "abierta"
DONE = "reembolsada"


def refund_out(request: RefundRequest | None) -> RefundRequestOut | None:
    if request is None:
        return None
    return RefundRequestOut(
        status=request.status, reason=request.reason, created_at=request.created_at, resolved_at=request.resolved_at
    )


def latest_request(db: Session, *, order_id: uuid.UUID | None = None, rental_id: uuid.UUID | None = None):
    column, value = (RefundRequest.order_id, order_id) if order_id else (RefundRequest.rental_id, rental_id)
    return db.scalars(select(RefundRequest).where(column == value).order_by(RefundRequest.created_at.desc())).first()


def _owned_order(db: Session, user: User, order_id: uuid.UUID) -> Order:
    order = order_service.lock_order(db, order_id)
    if order is None or order.user_id != user.id:
        raise NotFoundError("El pedido no existe.")
    return order


def _owned_rental(db: Session, user: User, rental_id: uuid.UUID) -> Rental:
    rental = db.scalars(select(Rental).where(Rental.id == rental_id).with_for_update(of=Rental)).unique().one_or_none()
    if rental is None or rental.user_id != user.id:
        raise NotFoundError("El alquiler no existe.")
    return rental


# ── Cliente ─────────────────────────────────────────────────────────────────


def cancel_order(db: Session, user: User, order_id: uuid.UUID) -> None:
    order = _owned_order(db, user, order_id)
    if order.status != OrderStatus.PENDING:
        raise ConflictError("Solo puedes cancelar un pedido sin pagar. Si ya lo pagaste, solicita el reembolso.")
    order_service.release_order_stock(db, order)
    order.status = OrderStatus.CANCELLED
    db.commit()


def cancel_rental(db: Session, user: User, rental_id: uuid.UUID) -> None:
    rental = _owned_rental(db, user, rental_id)
    if rental.status != RentalStatus.PENDING:
        raise ConflictError("Solo puedes cancelar un alquiler sin pagar. Si ya lo pagaste, solicita el reembolso.")
    rental.status = RentalStatus.CANCELLED  # la unidad queda libre
    db.commit()


def request_refund(
    db: Session, user: User, reason: str, *, order_id: uuid.UUID | None = None, rental_id: uuid.UUID | None = None
) -> RefundRequestOut:
    if order_id:
        if _owned_order(db, user, order_id).status != OrderStatus.PAID:
            raise ConflictError("Solo se puede solicitar el reembolso de un pedido pagado que aún no se entregó.")
    else:
        if _owned_rental(db, user, rental_id).status != RentalStatus.CONFIRMED:  # type: ignore[arg-type]
            raise ConflictError("Solo se puede solicitar el reembolso de un alquiler pagado que aún no se entregó.")
    existing = latest_request(db, order_id=order_id, rental_id=rental_id)
    if existing is not None and existing.status == OPEN:
        raise ConflictError("Ya solicitaste el reembolso. EcoMovilidad lo está revisando.")
    request = RefundRequest(user_id=user.id, order_id=order_id, rental_id=rental_id, reason=reason)
    db.add(request)
    db.commit()
    return refund_out(request)  # type: ignore[return-value]


# ── Panel ───────────────────────────────────────────────────────────────────


def resolve_refund(db: Session, *, order_id: uuid.UUID | None = None, rental_id: uuid.UUID | None = None) -> None:
    """El administrador devolvió el dinero en la pasarela: se cancela y se devuelve lo vendido."""
    request = latest_request(db, order_id=order_id, rental_id=rental_id)
    if request is None or request.status != OPEN:
        raise ConflictError("No hay una solicitud de reembolso abierta.")
    if order_id:
        order = order_service.lock_order(db, order_id)
        if order is None or order.status != OrderStatus.PAID:
            raise ConflictError("El pedido ya no está pagado y sin entregar.")
        order_service.restock_order(db, order)
        order.status = OrderStatus.CANCELLED
    else:
        rental = db.scalars(select(Rental).where(Rental.id == rental_id).with_for_update(of=Rental)).unique().one()
        if rental.status != RentalStatus.CONFIRMED:
            raise ConflictError("El alquiler ya no está pagado y sin entregar.")
        rental.status = RentalStatus.CANCELLED
    request.status = DONE
    request.resolved_at = now_utc()
    db.commit()


def open_requests(db: Session) -> list[AdminRefundRequestOut]:
    requests = db.scalars(select(RefundRequest).where(RefundRequest.status == OPEN).order_by(RefundRequest.created_at))
    result = []
    for request in requests:
        column, value = (
            (Payment.order_id, request.order_id) if request.order_id else (Payment.rental_id, request.rental_id)
        )
        amount = db.scalar(
            select(Payment.amount_in_cents).where(column == value, Payment.status == PaymentStatus.APPROVED)
        )
        result.append(
            AdminRefundRequestOut(
                status=request.status,
                reason=request.reason,
                created_at=request.created_at,
                order_id=request.order_id,
                rental_id=request.rental_id,
                user_email=db.get(User, request.user_id).email,  # type: ignore[union-attr]
                amount=(amount or 0) // 100,
            )
        )
    return result
