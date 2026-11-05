"""Reglas de los domicilios (CU-07, CU-08, CU-14).

Un pedido pagado con entrega a domicilio crea su domicilio en la misma
transacción. Entregarlo exige una prueba (QR o firma) y completa el pedido.
"""

import hmac
import secrets
import uuid

import segno
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError
from app.models import Courier, Delivery, DeliveryEvent, Order
from app.models.enums import DeliveryProof, DeliveryStatus, FulfillmentMethod, OrderStatus
from app.modules.domicilios.schemas import (
    CourierCreateIn,
    CourierOut,
    CourierUpdateIn,
    CustomerDeliveryOut,
    DeliveryEventOut,
    DeliveryStatusIn,
    DeliveryValidationIn,
    TrackingOut,
    TrackingPositionOut,
)
from app.modules.inventario.reservations import now_utc
from app.modules.telemetria import service as telemetry

# "Entregado" no está aquí: solo se llega validando la entrega.
TRANSITIONS: dict[DeliveryStatus, set[DeliveryStatus]] = {
    DeliveryStatus.CREATED: {DeliveryStatus.FAILED},
    DeliveryStatus.ASSIGNED: {DeliveryStatus.PICKING_UP, DeliveryStatus.FAILED},
    DeliveryStatus.PICKING_UP: {DeliveryStatus.IN_TRANSIT, DeliveryStatus.FAILED},
    DeliveryStatus.IN_TRANSIT: {DeliveryStatus.FAILED},
    DeliveryStatus.FAILED: {DeliveryStatus.CREATED},  # reprogramar
    DeliveryStatus.DELIVERED: set(),
}
ASSIGNABLE = {DeliveryStatus.CREATED, DeliveryStatus.ASSIGNED}
OPEN_STATUSES = (
    DeliveryStatus.CREATED,
    DeliveryStatus.ASSIGNED,
    DeliveryStatus.PICKING_UP,
    DeliveryStatus.IN_TRANSIT,
)
NOT_REFUNDABLE = {DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELIVERED}


def _add_event(delivery: Delivery, status: DeliveryStatus, note: str | None, user_id: uuid.UUID | None) -> None:
    delivery.status = status
    delivery.events.append(DeliveryEvent(status=status, note=note, user_id=user_id, created_at=now_utc()))


def create_for_order(db: Session, order: Order) -> Delivery | None:
    """Se llama al aprobarse el pago. Una recogida en sucursal no tiene domicilio."""
    if order.fulfillment_method != FulfillmentMethod.DELIVERY:
        return None
    existing = db.scalar(select(Delivery).where(Delivery.order_id == order.id))
    if existing is not None:
        return existing
    delivery = Delivery(
        order_id=order.id,
        tracking_token=secrets.token_urlsafe(24),
        confirmation_code=f"{secrets.randbelow(1_000_000):06d}",
    )
    _add_event(delivery, DeliveryStatus.CREATED, None, None)
    db.add(delivery)
    return delivery


def delivery_of_order(db: Session, order_id: uuid.UUID) -> Delivery | None:
    return db.scalar(select(Delivery).where(Delivery.order_id == order_id).options(selectinload(Delivery.events)))


def has_delivery(db: Session, order_id: uuid.UUID) -> bool:
    return db.scalar(select(func.count()).select_from(Delivery).where(Delivery.order_id == order_id)) > 0


def _events(delivery: Delivery) -> list[DeliveryEventOut]:
    return [DeliveryEventOut(status=e.status, note=e.note, created_at=e.created_at) for e in delivery.events]


def customer_view(delivery: Delivery) -> CustomerDeliveryOut:
    # El código solo sirve mientras el pedido puede entregarse.
    pending = delivery.status in OPEN_STATUSES
    return CustomerDeliveryOut(
        status=delivery.status,
        tracking_token=delivery.tracking_token,
        confirmation_code=delivery.confirmation_code if pending else None,
        qr_image=segno.make(delivery.confirmation_code).svg_data_uri(scale=6, border=2) if pending else None,
        courier_name=delivery.courier.name if delivery.courier else None,
        delivered_at=delivery.delivered_at,
        failure_reason=delivery.failure_reason,
        events=_events(delivery),
    )


def _public_position(db: Session, delivery: Delivery) -> TrackingPositionOut | None:
    """La ubicación del domiciliario solo se comparte mientras lleva este pedido."""
    if delivery.status != DeliveryStatus.IN_TRANSIT or delivery.courier_id is None:
        return None
    found = telemetry.courier_position(db, delivery.courier_id)
    if found is None:
        return None
    latitude, longitude, updated_at = found
    return TrackingPositionOut(lat=latitude, lng=longitude, updated_at=updated_at)


def tracking(db: Session, token: str) -> TrackingOut:
    delivery = db.scalar(
        select(Delivery)
        .where(Delivery.tracking_token == token)
        .options(selectinload(Delivery.events), selectinload(Delivery.order))
    )
    if delivery is None:
        raise NotFoundError("No encontramos ese seguimiento.")
    order = delivery.order
    return TrackingOut(
        status=delivery.status,
        courier_first_name=delivery.courier.name.split()[0] if delivery.courier else None,
        city=order.delivery_city,
        branch_name=order.branch.name,
        scheduled_date=order.scheduled_date,
        time_slot=order.time_slot,
        delivered_at=delivery.delivered_at,
        position=_public_position(db, delivery),
        # Las notas pueden traer datos internos: el enlace público solo muestra estados y fechas.
        events=[DeliveryEventOut(status=e.status, created_at=e.created_at) for e in delivery.events],
    )


def lock_delivery(db: Session, delivery_id: uuid.UUID) -> Delivery:
    delivery = db.scalar(select(Delivery).where(Delivery.id == delivery_id).with_for_update(of=Delivery))
    if delivery is None:
        raise NotFoundError("El domicilio no existe.")
    return delivery


def assign_courier(db: Session, delivery_id: uuid.UUID, courier_id: uuid.UUID, user_id: uuid.UUID) -> None:
    delivery = lock_delivery(db, delivery_id)
    if DeliveryStatus(delivery.status) not in ASSIGNABLE:
        raise ConflictError("Este domicilio ya salió: no se puede cambiar el domiciliario.")
    courier = db.get(Courier, courier_id)
    if courier is None or not courier.is_active:
        raise ConflictError("Ese domiciliario no está disponible.")
    delivery.courier = courier
    _add_event(delivery, DeliveryStatus.ASSIGNED, f"Asignado a {courier.name}", user_id)
    db.commit()


def assign_nearest(db: Session, delivery_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """RF 5.1: el más cercano a la sucursal que despacha, entre los que tienen GPS reciente."""
    delivery = db.get(Delivery, delivery_id)
    if delivery is None:
        raise NotFoundError("El domicilio no existe.")
    courier_id = telemetry.nearest_courier(db, delivery.order.branch_id)
    if courier_id is None:
        raise ConflictError("Ningún domiciliario activo tiene GPS reciente. Asigna uno manualmente.")
    assign_courier(db, delivery_id, courier_id, user_id)


def change_status(db: Session, delivery_id: uuid.UUID, data: DeliveryStatusIn, user_id: uuid.UUID) -> None:
    delivery = lock_delivery(db, delivery_id)
    current = DeliveryStatus(delivery.status)
    if data.status not in TRANSITIONS[current]:
        raise ConflictError("Ese cambio de estado no está permitido.")
    note = data.note.strip() if data.note else None
    if data.status == DeliveryStatus.FAILED:
        delivery.failure_reason = note
    if data.status == DeliveryStatus.CREATED:
        if delivery.order.status != OrderStatus.PAID:
            raise ConflictError("Solo se reprograma el domicilio de un pedido pagado.")
        delivery.courier = None
        delivery.failure_reason = None
    _add_event(delivery, data.status, note, user_id)
    db.commit()


def validate_delivery(db: Session, delivery_id: uuid.UUID, data: DeliveryValidationIn, user_id: uuid.UUID) -> None:
    """CU-08: la entrega se cierra con el código del cliente o con su firma."""
    delivery = lock_delivery(db, delivery_id)
    if delivery.status != DeliveryStatus.IN_TRANSIT:
        raise ConflictError("Solo se valida un domicilio en tránsito.")
    if data.method == DeliveryProof.QR:
        if not hmac.compare_digest(data.code or "", delivery.confirmation_code):
            raise ConflictError("El código no coincide. Pídele al cliente que lo revise.")
    else:
        delivery.signer_name = data.signer_name
        delivery.signature_image = data.signature_image
    delivery.proof_method = data.method
    delivery.delivered_at = now_utc()
    _add_event(delivery, DeliveryStatus.DELIVERED, None, user_id)
    order = db.scalar(select(Order).where(Order.id == delivery.order_id).with_for_update(of=Order))
    if order.status != OrderStatus.PAID:
        raise ConflictError("El pedido ya no está pendiente de entrega.")
    order.status = OrderStatus.COMPLETED
    db.commit()


def on_order_refunded(db: Session, order_id: uuid.UUID) -> None:
    """Un reembolso cierra el domicilio. Si ya va en camino, primero debe volver."""
    delivery = db.scalar(select(Delivery).where(Delivery.order_id == order_id).with_for_update(of=Delivery))
    if delivery is None:
        return
    if DeliveryStatus(delivery.status) in NOT_REFUNDABLE:
        raise ConflictError(
            "El domicilio ya va en camino o fue entregado. Regístralo como fallido antes del reembolso."
        )
    if delivery.status != DeliveryStatus.FAILED:
        delivery.failure_reason = "Pedido reembolsado"
        _add_event(delivery, DeliveryStatus.FAILED, "Pedido reembolsado", None)


# ── Domiciliarios ────────────────────────────────────────────────────────────


def _courier_out(courier: Courier, open_deliveries: int) -> CourierOut:
    return CourierOut(
        id=courier.id,
        name=courier.name,
        phone=courier.phone,
        is_active=courier.is_active,
        open_deliveries=open_deliveries,
    )


def list_couriers(db: Session) -> list[CourierOut]:
    counts = dict(
        db.execute(
            select(Delivery.courier_id, func.count())
            .where(Delivery.status.in_(OPEN_STATUSES), Delivery.courier_id.is_not(None))
            .group_by(Delivery.courier_id)
        ).all()
    )
    couriers = db.scalars(select(Courier).order_by(Courier.is_active.desc(), Courier.name)).all()
    return [_courier_out(c, counts.get(c.id, 0)) for c in couriers]


def create_courier(db: Session, data: CourierCreateIn) -> CourierOut:
    courier = Courier(name=data.name.strip(), phone=data.phone.strip())
    db.add(courier)
    db.commit()
    return _courier_out(courier, 0)


def update_courier(db: Session, courier_id: uuid.UUID, data: CourierUpdateIn) -> CourierOut:
    courier = db.get(Courier, courier_id)
    if courier is None:
        raise NotFoundError("El domiciliario no existe.")
    for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(courier, field, value)
    db.commit()
    return _courier_out(courier, 0)
