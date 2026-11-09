"""Pagos de pedidos y alquileres con la pasarela (Wompi).

Reglas:
- El estado de un pago SOLO cambia con datos verificados de la pasarela:
  consulta servidor a servidor con la llave privada o evento con firma válida.
  Nunca con lo que diga el navegador.
- Se valida que referencia, monto y moneda coincidan con lo cobrado.
- Aplicar un pago aprobado es idempotente y va en una transacción: el pedido
  pasa a pagado, el inventario se descuenta y se emite la factura, o nada.
- Orden de bloqueo: pago → pedido/alquiler → inventario.
- Un pago aprobado que no se puede aplicar (pedido vencido o ya pagado) queda
  marcado `requires_refund` para el panel; no se pierde.
"""

import logging
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import exists, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.email import EmailMessage, get_email_sender
from app.core.errors import ConflictError, NotFoundError, ServiceError
from app.models import Invoice, Order, Payment, PaymentEvent, Rental, User
from app.models.enums import OrderStatus, PaymentStatus, RentalStatus
from app.modules.domicilios import service as delivery_service
from app.modules.inventario.reservations import now_utc
from app.modules.pagos.gateway import (
    CheckoutCustomer,
    GatewayTransaction,
    ManualGateway,
    PaymentGateway,
    SimulatedGateway,
)
from app.modules.pagos.invoices import issue_invoice
from app.modules.pagos.queries import invoice_ref
from app.modules.pagos.schemas import (
    ManualPaymentOut,
    PaymentConfigOut,
    PaymentResultOut,
    PaymentStartOut,
    SimulationDecisionOut,
    SimulationOut,
)
from app.modules.pedidos import service as order_service

logger = logging.getLogger("ecomovilidad.payments")

# Tras vencer el plazo, un pago que la pasarela aún procesa (p. ej. PSE) tiene
# este margen antes de que se cancele lo apartado.
PENDING_GRACE = timedelta(minutes=15)
LEGAL_ID_TYPES = {"CC": "CC", "CE": "CE", "NIT": "NIT", "PAS": "PP"}


def payment_config() -> PaymentConfigOut:
    settings = get_settings()
    return PaymentConfigOut(
        enabled=settings.payments_enabled,
        sandbox=settings.payments_sandbox,
        window_minutes=settings.payment_window_minutes,
        provider=settings.active_payment_provider,
    )


# ── Iniciar un pago ─────────────────────────────────────────────────────────


def _new_reference(kind: str, target_id: uuid.UUID) -> str:
    return f"EM{kind}-{str(target_id)[:8].upper()}-{secrets.token_hex(4).upper()}"


def _customer(target: Order | Rental, user: User) -> CheckoutCustomer:
    return CheckoutCustomer(
        email=target.contact_email or user.email,
        full_name=target.contact_name or f"{user.first_name} {user.last_name}",
        phone=target.contact_phone or user.phone or "",
        legal_id=target.document_number or "",
        legal_id_type=LEGAL_ID_TYPES.get(target.document_type or "CC", "CC"),
    )


def start_payment(
    db: Session, user: User, gateway: PaymentGateway, *, order_id: uuid.UUID | None, rental_id: uuid.UUID | None
) -> PaymentStartOut:
    if (order_id is None) == (rental_id is None):
        raise ServiceError("Indica el pedido o el alquiler que quieres pagar.")
    now = now_utc()
    if order_id:
        target: Order | Rental | None = db.scalars(
            select(Order).where(Order.id == order_id, Order.user_id == user.id).with_for_update(of=Order)
        ).one_or_none()
        if target is None:
            raise NotFoundError("El pedido no existe.")
        if target.status != OrderStatus.PENDING:
            raise ConflictError("Este pedido ya no está pendiente de pago.")
        amount, kind = target.total, "P"
    else:
        target = db.scalars(
            select(Rental).where(Rental.id == rental_id, Rental.user_id == user.id).with_for_update(of=Rental)
        ).one_or_none()
        if target is None:
            raise NotFoundError("El alquiler no existe.")
        if target.status != RentalStatus.PENDING:
            raise ConflictError("Este alquiler ya no está pendiente de pago.")
        amount, kind = target.price, "A"
    if target.payment_expires_at is None or target.payment_expires_at <= now:
        raise ConflictError("El plazo para pagar venció. Vuelve a hacer la solicitud.")

    payment = Payment(
        user_id=user.id,
        provider=gateway.name,
        order_id=order_id,
        rental_id=rental_id,
        reference=_new_reference(kind, target.id),
        amount_in_cents=amount * 100,
        currency="COP",
    )
    db.add(payment)
    db.flush()
    url = gateway.checkout_url(
        reference=payment.reference,
        amount_in_cents=payment.amount_in_cents,
        redirect_url=f"{get_settings().frontend_url.rstrip('/')}/pagos/resultado",
        expires_at=target.payment_expires_at,
        customer=_customer(target, user),
    )
    db.commit()
    return PaymentStartOut(
        checkout_url=url,
        reference=payment.reference,
        expires_at=target.payment_expires_at,
        sandbox=gateway.sandbox,
        provider=gateway.name,
    )


# ── Aplicar una transacción verificada ──────────────────────────────────────


def _notify(payment: Payment, target: Order | Rental, invoice: Invoice) -> None:
    what = "tu pedido" if isinstance(target, Order) else "tu alquiler"
    get_email_sender().send(
        EmailMessage(
            to=target.contact_email or "",
            subject=f"Pago aprobado: factura {invoice.full_number}",
            body=(
                f"Recibimos el pago de {what} (referencia {payment.reference}). "
                f"Tu factura {invoice.full_number} está disponible en EcoMovilidad, en Mi cuenta."
            ),
        )
    )


def _apply_to_order(db: Session, payment: Payment) -> None:
    order = order_service.lock_order(db, payment.order_id)  # type: ignore[arg-type]
    if order is None or order.status != OrderStatus.PENDING:
        payment.requires_refund = True
        logger.error("Pago aprobado %s sobre un pedido no pendiente: requiere reembolso.", payment.reference)
        return
    order_service.settle_order_stock(db, order)
    order.status = OrderStatus.PAID
    delivery_service.create_for_order(db, order)
    db.flush()
    invoice = issue_invoice(db, payment, order=order)
    _notify(payment, order, invoice)


def _apply_to_rental(db: Session, payment: Payment) -> None:
    rental = db.scalars(select(Rental).where(Rental.id == payment.rental_id).with_for_update(of=Rental)).one_or_none()
    if rental is None or rental.status != RentalStatus.PENDING:
        payment.requires_refund = True
        logger.error("Pago aprobado %s sobre un alquiler no pendiente: requiere reembolso.", payment.reference)
        return
    rental.status = RentalStatus.CONFIRMED
    db.flush()
    invoice = issue_invoice(db, payment, rental=rental)
    _notify(payment, rental, invoice)


def apply_transaction(db: Session, tx: GatewayTransaction) -> Payment | None:
    """Aplica una transacción ya verificada. No hace commit."""
    payment = db.scalars(select(Payment).where(Payment.reference == tx.reference).with_for_update()).one_or_none()
    if payment is None:
        logger.warning("Transacción %s con referencia desconocida %s", tx.id, tx.reference)
        return None
    new_status = PaymentStatus(tx.status.lower()) if tx.status.lower() in set(PaymentStatus) else PaymentStatus.ERROR
    if payment.status == PaymentStatus.APPROVED:
        if new_status == PaymentStatus.APPROVED and tx.id != payment.provider_transaction_id:
            # Otra transacción aprobada con la misma referencia: cobro doble.
            logger.error("Segunda transacción aprobada %s para el pago %s", tx.id, payment.reference)
        return payment  # un pago aplicado no retrocede
    if tx.amount_in_cents != payment.amount_in_cents or tx.currency != payment.currency:
        payment.status = PaymentStatus.ERROR
        payment.status_message = "El monto o la moneda no coinciden con lo cobrado."
        logger.error("Transacción %s con monto distinto al del pago %s", tx.id, payment.reference)
        return payment

    payment.provider_transaction_id = tx.id
    payment.payment_method_type = tx.payment_method_type
    payment.status_message = (tx.status_message or None) and tx.status_message[:255]
    payment.status = new_status
    if new_status == PaymentStatus.APPROVED:
        payment.approved_at = now_utc()
        # El pedido o alquiler puede haber recibido ya otro pago aprobado.
        already_paid = db.scalar(
            select(
                exists().where(
                    Payment.id != payment.id,
                    Payment.status == PaymentStatus.APPROVED,
                    ~Payment.requires_refund,
                    (Payment.order_id == payment.order_id)
                    if payment.order_id
                    else (Payment.rental_id == payment.rental_id),
                )
            )
        )
        if already_paid:
            payment.requires_refund = True
            logger.error("Pago %s aprobado sobre un objetivo ya pagado: requiere reembolso.", payment.reference)
        elif payment.order_id:
            _apply_to_order(db, payment)
        else:
            _apply_to_rental(db, payment)
    return payment


def _result(db: Session, payment: Payment) -> PaymentResultOut:
    invoice = db.scalars(select(Invoice).where(Invoice.payment_id == payment.id)).one_or_none()
    return PaymentResultOut(
        status=payment.status,
        reference=payment.reference,
        target="pedido" if payment.order_id else "alquiler",
        order_id=payment.order_id,
        rental_id=payment.rental_id,
        payment_method_type=payment.payment_method_type,
        status_message=payment.status_message,
        invoice=invoice_ref(invoice) if invoice else None,
        requires_refund=payment.requires_refund,
    )


def verify_return(db: Session, user: User, gateway: PaymentGateway, transaction_id: str) -> PaymentResultOut:
    """Regreso del cliente desde la pasarela: consulta la transacción a Wompi."""
    tx = gateway.get_transaction(transaction_id)
    if tx is None:
        raise NotFoundError("No encontramos ese pago.")
    owner = db.scalar(select(Payment.user_id).where(Payment.reference == tx.reference))
    if owner is None or owner != user.id:
        raise NotFoundError("No encontramos ese pago.")  # tampoco revela pagos de otros usuarios
    payment = apply_transaction(db, tx)
    db.commit()
    assert payment is not None
    return _result(db, payment)


def handle_event(db: Session, gateway: PaymentGateway, payload: dict[str, Any], checksum: str | None) -> bool:
    """Evento de la pasarela. Devuelve False si la firma no es válida."""
    if not gateway.verify_event(payload, checksum):
        logger.warning("Evento de pagos con firma inválida descartado.")
        return False
    received = str(checksum or payload["signature"]["checksum"]).lower()
    transaction = (payload.get("data") or {}).get("transaction") or {}
    inserted = db.execute(
        insert(PaymentEvent)
        .values(
            checksum=received,
            event=str(payload.get("event", ""))[:60],
            transaction_id=str(transaction.get("id"))[:64] if transaction.get("id") else None,
            status=str(transaction.get("status"))[:20] if transaction.get("status") else None,
            payload=payload,
        )
        .on_conflict_do_nothing(index_elements=["checksum"])
        .returning(PaymentEvent.id)
    ).scalar_one_or_none()
    if inserted is None:  # evento repetido: ya se procesó
        db.commit()
        return True
    if payload.get("event") == "transaction.updated" and transaction:
        apply_transaction(db, GatewayTransaction.from_wompi(transaction))
    db.commit()
    return True


def get_result(db: Session, user: User, reference: str) -> PaymentResultOut:
    payment = db.scalars(
        select(Payment).where(Payment.reference == reference, Payment.user_id == user.id)
    ).one_or_none()
    if payment is None:
        raise NotFoundError("No encontramos ese pago.")
    return _result(db, payment)


# ── Pasarela simulada ───────────────────────────────────────────────────────


def _own_simulated_payment(db: Session, user: User, gateway: PaymentGateway, reference: str) -> Payment:
    if not isinstance(gateway, SimulatedGateway):
        raise NotFoundError("La pasarela de pruebas no está disponible.")
    payment = db.scalars(
        select(Payment)
        .where(Payment.reference == reference, Payment.user_id == user.id, Payment.provider == gateway.name)
        .with_for_update()
    ).one_or_none()
    if payment is None:
        raise NotFoundError("No encontramos ese pago.")
    return payment


def simulation_info(db: Session, user: User, gateway: PaymentGateway, reference: str) -> SimulationOut:
    payment = _own_simulated_payment(db, user, gateway, reference)
    if payment.order_id:
        order = db.get(Order, payment.order_id)
        description, expires = (
            f"Pedido #{str(payment.order_id)[:8].upper()}",
            order.payment_expires_at if order else None,
        )
    else:
        rental = db.get(Rental, payment.rental_id)
        description = f"Alquiler de {rental.product.name}" if rental else "Alquiler"
        expires = rental.payment_expires_at if rental else None
    db.rollback()  # libera el bloqueo de la consulta
    return SimulationOut(
        reference=payment.reference,
        amount=payment.amount_in_cents // 100,
        status=payment.status,
        target="pedido" if payment.order_id else "alquiler",
        description=description,
        expires_at=expires,
    )


def simulate_decision(
    db: Session, user: User, gateway: PaymentGateway, reference: str, decision: str
) -> SimulationDecisionOut:
    """El cliente aprueba o rechaza en la pasarela simulada. Se aplica con el
    mismo código que una transacción de Wompi (inventario, factura, estados)."""
    payment = _own_simulated_payment(db, user, gateway, reference)
    if payment.status != PaymentStatus.PENDING:
        raise ConflictError("Este pago ya se procesó. Inicia un pago nuevo si lo necesitas.")
    approved = decision == PaymentStatus.APPROVED
    tx = GatewayTransaction(
        id=f"SIM-{secrets.token_hex(8).upper()}",
        reference=payment.reference,
        status="APPROVED" if approved else "DECLINED",
        amount_in_cents=payment.amount_in_cents,
        currency=payment.currency,
        payment_method_type=SimulatedGateway.METHOD,
        status_message=None if approved else "Rechazado en la pasarela de pruebas.",
    )
    apply_transaction(db, tx)
    db.commit()
    return SimulationDecisionOut(transaction_id=tx.id)


# ── Pago manual ─────────────────────────────────────────────────────────────


def manual_info(db: Session, user: User, gateway: PaymentGateway, reference: str) -> ManualPaymentOut:
    if not isinstance(gateway, ManualGateway):
        raise NotFoundError("El pago manual no está disponible.")
    payment = db.scalars(
        select(Payment).where(
            Payment.reference == reference, Payment.user_id == user.id, Payment.provider == gateway.name
        )
    ).one_or_none()
    if payment is None:
        raise NotFoundError("No encontramos ese pago.")
    target = db.get(Order, payment.order_id) if payment.order_id else db.get(Rental, payment.rental_id)
    return ManualPaymentOut(
        reference=payment.reference,
        amount=payment.amount_in_cents // 100,
        status=payment.status,
        target="pedido" if payment.order_id else "alquiler",
        target_id=target.id,
        expires_at=target.payment_expires_at,
        instructions=get_settings().payment_instructions,
    )


def resolve_manual_payment(db: Session, reference: str, *, approved: bool, note: str | None) -> None:
    """El panel confirma o rechaza lo recibido. Se aplica como cualquier
    transacción de una pasarela: inventario, domicilio y factura."""
    payment = db.scalars(select(Payment).where(Payment.reference == reference).with_for_update()).one_or_none()
    if payment is None or payment.provider != ManualGateway.name:
        raise NotFoundError("No encontramos ese pago manual.")
    if payment.status != PaymentStatus.PENDING:
        raise ConflictError("Este pago ya se procesó.")
    target = db.get(Order, payment.order_id) if payment.order_id else db.get(Rental, payment.rental_id)
    if approved and target.status != OrderStatus.PENDING:
        raise ConflictError("El pedido o alquiler ya no está pendiente: venció o se canceló.")
    tx = GatewayTransaction(
        id=f"MAN-{secrets.token_hex(8).upper()}",
        reference=payment.reference,
        status="APPROVED" if approved else "DECLINED",
        amount_in_cents=payment.amount_in_cents,
        currency=payment.currency,
        payment_method_type=ManualGateway.METHOD,
        status_message=note or (None if approved else "Pago no recibido."),
    )
    apply_transaction(db, tx)
    db.commit()


# ── Vencimiento sin pago ────────────────────────────────────────────────────


def _payment_in_progress(db: Session, column, target_id: uuid.UUID, now: datetime) -> bool:
    return bool(
        db.scalar(
            select(
                exists().where(
                    column == target_id,
                    Payment.status == PaymentStatus.PENDING,
                    Payment.created_at > now - PENDING_GRACE,
                )
            )
        )
    )


def expire_unpaid(db: Session, now: datetime | None = None) -> int:
    """Cancela pedidos y alquileres cuyo plazo de pago venció y libera lo
    apartado. Filas bloqueadas por otra transacción se omiten (SKIP LOCKED):
    la siguiente solicitud las procesa. No hace commit."""
    now = now or now_utc()
    expired = 0
    orders = db.scalars(
        select(Order)
        .where(Order.status == OrderStatus.PENDING, Order.payment_expires_at < now)
        .with_for_update(of=Order, skip_locked=True)
    ).all()
    for order in orders:
        if order.payment_expires_at > now - PENDING_GRACE and _payment_in_progress(db, Payment.order_id, order.id, now):
            continue
        order_service.release_order_stock(db, order)
        order.status = OrderStatus.CANCELLED
        expired += 1
    rentals = db.scalars(
        select(Rental)
        .where(Rental.status == RentalStatus.PENDING, Rental.payment_expires_at < now)
        .with_for_update(of=Rental, skip_locked=True)
    ).all()
    for rental in rentals:
        if rental.payment_expires_at > now - PENDING_GRACE and _payment_in_progress(
            db, Payment.rental_id, rental.id, now
        ):
            continue
        rental.status = RentalStatus.CANCELLED  # la unidad queda libre (la exclusión solo cuenta los vigentes)
        expired += 1
    return expired
