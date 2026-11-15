"""Reglas de los domicilios (CU-07, CU-08, CU-14).

Un pedido pagado con entrega a domicilio crea su domicilio en la misma
transacción. Entregarlo exige una prueba y completa el pedido:

- Domiciliario: el código QR del cliente o su firma.
- Dron: el GPS del dron prueba que liberó el paquete a menos de 50 m del punto
  de entrega, y el cliente confirma en su cuenta que lo recibió. Si no lo
  confirma ni reclama en 30 minutos, la evidencia del dron basta para cerrar.
"""

import hmac
import math
import secrets
import uuid
from datetime import datetime, timedelta

import segno
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError
from app.models import Courier, Delivery, DeliveryEvent, GpsDevice, Order, User
from app.models.enums import (
    AssetKind,
    DeliveryCarrier,
    DeliveryProof,
    DeliveryStatus,
    FulfillmentMethod,
    OrderStatus,
)
from app.modules.domicilios.schemas import (
    AssignDroneIn,
    CourierCreateIn,
    CourierOut,
    CourierUpdateIn,
    CustomerDeliveryOut,
    DeliveryEventOut,
    DeliveryStatusIn,
    DeliveryValidationIn,
    DropAck,
    TrackingOut,
    TrackingPositionOut,
)
from app.modules.inventario.reservations import now_utc
from app.modules.telemetria import service as telemetry

# El dron debe soltar el paquete cerca del punto de entrega, con GPS reciente.
DROP_RADIUS_M = 50
DRONE_GPS_MAX_AGE = timedelta(minutes=2)
# Sin confirmación ni reclamo del cliente en este plazo, la evidencia del dron cierra la entrega.
CLAIM_WINDOW = timedelta(minutes=30)

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


def distance_m(lat_a: float, lng_a: float, lat_b: float, lng_b: float) -> int:
    """Distancia en metros entre dos puntos (haversine; suficiente a escala de ciudad)."""
    radius = 6_371_000
    phi_a, phi_b = math.radians(lat_a), math.radians(lat_b)
    d_phi = math.radians(lat_b - lat_a)
    d_lambda = math.radians(lng_b - lng_a)
    h = math.sin(d_phi / 2) ** 2 + math.cos(phi_a) * math.cos(phi_b) * math.sin(d_lambda / 2) ** 2
    return round(2 * radius * math.asin(math.sqrt(h)))


def is_drone(delivery: Delivery) -> bool:
    return delivery.carrier == DeliveryCarrier.DRONE


def can_record_drop(delivery: Delivery) -> bool:
    return is_drone(delivery) and delivery.status == DeliveryStatus.IN_TRANSIT and delivery.dropped_at is None


def can_validate(delivery: Delivery) -> bool:
    """Un dron solo se valida después de liberar el paquete en el punto de entrega."""
    if delivery.status != DeliveryStatus.IN_TRANSIT:
        return False
    return not is_drone(delivery) or delivery.dropped_at is not None


def claim_window_passed(delivery: Delivery, now: datetime | None = None) -> bool:
    return delivery.dropped_at is not None and (now or now_utc()) - delivery.dropped_at >= CLAIM_WINDOW


def can_close_with_drone_evidence(delivery: Delivery) -> bool:
    return is_drone(delivery) and can_validate(delivery) and claim_window_passed(delivery)


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
        carrier=delivery.carrier,
        confirmation_code=delivery.confirmation_code if pending else None,
        qr_image=segno.make(delivery.confirmation_code).svg_data_uri(scale=6, border=2) if pending else None,
        courier_name=delivery.courier.name if delivery.courier else None,
        delivered_at=delivery.delivered_at,
        failure_reason=delivery.failure_reason,
        dropped_at=delivery.dropped_at,
        drop_distance_m=delivery.drop_distance_m,
        can_confirm_receipt=is_drone(delivery) and can_validate(delivery),
        events=_events(delivery),
    )


def _public_position(db: Session, delivery: Delivery) -> TrackingPositionOut | None:
    """La ubicación del domiciliario o del dron solo se comparte mientras lleva este pedido."""
    if delivery.status != DeliveryStatus.IN_TRANSIT:
        return None
    if is_drone(delivery):
        found = telemetry.device_position(db, delivery.drone_device_id) if delivery.drone_device_id else None
    else:
        found = telemetry.courier_position(db, delivery.courier_id) if delivery.courier_id else None
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
        carrier=delivery.carrier,
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
    delivery.carrier = DeliveryCarrier.COURIER
    delivery.drone_device_id = None
    delivery.courier = courier
    _add_event(delivery, DeliveryStatus.ASSIGNED, f"Asignado a {courier.name}", user_id)
    db.commit()


def delivery_drones(db: Session) -> list[GpsDevice]:
    """Drones de domicilios: dispositivos de tipo dron que no son de la flota de alquiler."""
    return list(
        db.scalars(
            select(GpsDevice)
            .where(
                GpsDevice.kind == AssetKind.DRONE,
                GpsDevice.is_active,
                GpsDevice.rental_unit_id.is_(None),
                GpsDevice.courier_id.is_(None),
            )
            .order_by(GpsDevice.code)
        )
    )


def assign_drone(db: Session, delivery_id: uuid.UUID, data: AssignDroneIn, user_id: uuid.UUID) -> None:
    """El dron vuela al punto exacto de entrega, que debe estar dentro de las zonas permitidas."""
    delivery = lock_delivery(db, delivery_id)
    if DeliveryStatus(delivery.status) not in ASSIGNABLE:
        raise ConflictError("Este domicilio ya salió: no se puede cambiar quién lo lleva.")
    drone = db.get(GpsDevice, data.drone_device_id)
    if drone is None or drone not in delivery_drones(db):
        raise ConflictError("Ese dispositivo no es un dron de domicilios activo.")
    busy = db.scalar(
        select(func.count())
        .select_from(Delivery)
        .where(
            Delivery.drone_device_id == drone.id,
            Delivery.status.in_(OPEN_STATUSES),
            Delivery.id != delivery.id,
        )
    )
    if busy:
        raise ConflictError("Ese dron ya lleva otro domicilio.")
    if telemetry.is_outside_zones(db, data.destination_latitude, data.destination_longitude):
        raise ConflictError("El punto de entrega está fuera de las zonas donde los drones pueden volar.")
    delivery.carrier = DeliveryCarrier.DRONE
    delivery.courier = None
    delivery.drone_device_id = drone.id
    delivery.destination_latitude = data.destination_latitude
    delivery.destination_longitude = data.destination_longitude
    _add_event(delivery, DeliveryStatus.ASSIGNED, f"Asignado al dron {drone.code}", user_id)
    db.commit()


def _record_drop(db: Session, delivery: Delivery, latitude: float, longitude: float, user_id: uuid.UUID | None) -> int:
    """Guarda la evidencia de la liberación. Rechaza si el dron no está sobre el punto de entrega."""
    if not can_record_drop(delivery):
        raise ConflictError("Solo se registra la liberación de un dron en camino que aún no la registró.")
    meters = distance_m(
        float(delivery.destination_latitude), float(delivery.destination_longitude), latitude, longitude
    )
    if meters > DROP_RADIUS_M:
        raise ConflictError(
            f"El dron está a {meters} m del punto de entrega: debe estar a menos de {DROP_RADIUS_M} m "
            "para liberar el paquete."
        )
    delivery.drop_latitude = latitude
    delivery.drop_longitude = longitude
    delivery.drop_distance_m = meters
    delivery.dropped_at = now_utc()
    _add_event(delivery, DeliveryStatus.IN_TRANSIT, f"Paquete liberado a {meters} m del punto de entrega", user_id)
    return meters


def record_drop_from_panel(db: Session, delivery_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """El panel registra la liberación con la última posición GPS del dron (debe ser reciente)."""
    delivery = lock_delivery(db, delivery_id)
    if not can_record_drop(delivery):
        raise ConflictError("Solo se registra la liberación de un dron en camino que aún no la registró.")
    found = telemetry.device_position(db, delivery.drone_device_id, max_age=DRONE_GPS_MAX_AGE)
    if found is None:
        raise ConflictError("El dron no ha reportado su posición en los últimos 2 minutos.")
    latitude, longitude, _ = found
    _record_drop(db, delivery, latitude, longitude, user_id)
    db.commit()


def record_drop_from_device(db: Session, device: GpsDevice, latitude: float, longitude: float) -> DropAck:
    """El propio dron avisa que soltó el paquete (POST /telemetry/drops con su token)."""
    delivery = db.scalar(
        select(Delivery)
        .where(Delivery.drone_device_id == device.id, Delivery.status == DeliveryStatus.IN_TRANSIT)
        .with_for_update(of=Delivery)
    )
    if delivery is None:
        raise ConflictError("Este dron no lleva un domicilio en camino.")
    meters = _record_drop(db, delivery, latitude, longitude, None)
    db.commit()
    return DropAck(dropped_at=delivery.dropped_at, distance_m=meters)


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
        # Reprogramar empieza de cero: sin dron ni evidencia de una liberación anterior.
        delivery.carrier = DeliveryCarrier.COURIER
        delivery.drone_device_id = None
        delivery.drop_latitude = delivery.drop_longitude = None
        delivery.drop_distance_m = None
        delivery.dropped_at = None
    _add_event(delivery, data.status, note, user_id)
    db.commit()


def _finish(
    db: Session, delivery: Delivery, method: DeliveryProof, user_id: uuid.UUID | None, note: str | None
) -> None:
    delivery.proof_method = method
    delivery.delivered_at = now_utc()
    _add_event(delivery, DeliveryStatus.DELIVERED, note, user_id)
    order = db.scalar(select(Order).where(Order.id == delivery.order_id).with_for_update(of=Order))
    if order.status != OrderStatus.PAID:
        raise ConflictError("El pedido ya no está pendiente de entrega.")
    order.status = OrderStatus.COMPLETED
    db.commit()


def validate_delivery(db: Session, delivery_id: uuid.UUID, data: DeliveryValidationIn, user_id: uuid.UUID) -> None:
    """CU-08: el panel cierra la entrega con el código del cliente, su firma o la evidencia del dron."""
    delivery = lock_delivery(db, delivery_id)
    if delivery.status != DeliveryStatus.IN_TRANSIT:
        raise ConflictError("Solo se valida un domicilio en tránsito.")
    if is_drone(delivery):
        if delivery.dropped_at is None:
            raise ConflictError("El dron aún no ha liberado el paquete en el punto de entrega.")
        if data.method == DeliveryProof.SIGNATURE:
            raise ConflictError("Un domicilio con dron se confirma con el código del cliente o la evidencia del dron.")
        if data.method == DeliveryProof.DRONE and not claim_window_passed(delivery):
            raise ConflictError(
                "La evidencia del dron cierra la entrega solo si el cliente no la confirma en 30 minutos."
            )
    elif data.method == DeliveryProof.DRONE:
        raise ConflictError("Este domicilio lo lleva un domiciliario: valida con el código o la firma.")
    note = None
    if data.method == DeliveryProof.QR:
        if not hmac.compare_digest(data.code or "", delivery.confirmation_code):
            raise ConflictError("El código no coincide. Pídele al cliente que lo revise.")
    elif data.method == DeliveryProof.SIGNATURE:
        delivery.signer_name = data.signer_name
        delivery.signature_image = data.signature_image
    else:
        note = "Cerrado con la evidencia del dron: el cliente no confirmó ni reclamó a tiempo"
    _finish(db, delivery, DeliveryProof(data.method), user_id, note)


def confirm_receipt(db: Session, user: User, order_id: uuid.UUID) -> None:
    """El cliente confirma en su cuenta que recibió el paquete que dejó el dron."""
    delivery = db.scalar(
        select(Delivery)
        .join(Order, Order.id == Delivery.order_id)
        .where(Delivery.order_id == order_id, Order.user_id == user.id)
        .with_for_update(of=Delivery)
    )
    if delivery is None:
        raise NotFoundError("El pedido no existe.")
    if not (is_drone(delivery) and can_validate(delivery)):
        raise ConflictError("Todavía no hay un paquete entregado por dron para confirmar.")
    delivery.customer_confirmed_at = now_utc()
    _finish(db, delivery, DeliveryProof.DRONE, user.id, "El cliente confirmó que recibió el paquete")


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
