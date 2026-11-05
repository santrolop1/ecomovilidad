"""Ingesta de posiciones, estado de la flota y zonas permitidas (CU-10, CU-11)."""

import uuid
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, ServiceError
from app.core.security import hash_token, new_token
from app.models import (
    Branch,
    Courier,
    Delivery,
    Geofence,
    GeofenceAlert,
    GpsDevice,
    GpsPosition,
    Rental,
    RentalUnit,
)
from app.models.enums import DeliveryStatus, RentalStatus, RentalUnitStatus
from app.modules.inventario.reservations import now_utc
from app.modules.telemetria.schemas import (
    FleetAssetOut,
    FleetSnapshotOut,
    GeofenceAlertOut,
    GeofenceCreateIn,
    GeofenceOut,
    GeoPointOut,
    GpsDeviceCreatedOut,
    GpsDeviceCreateIn,
    GpsDeviceOut,
    PositionAck,
    PositionIn,
)

MIN_REPORT_INTERVAL = timedelta(seconds=1)
STALE_AFTER = timedelta(minutes=5)
NEAREST_MAX_AGE = timedelta(minutes=10)
TRAIL_POINTS = 10


class TooManyReports(ServiceError):
    status_code = 429


def point(latitude, longitude):
    return func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326).cast(Geofence.location.type)


# ── Ingesta ──────────────────────────────────────────────────────────────────


def device_for_token(db: Session, token: str | None) -> GpsDevice | None:
    if not token:
        return None
    return db.scalar(
        select(GpsDevice).where(GpsDevice.token_hash == hash_token(token), GpsDevice.is_active).with_for_update()
    )


def is_outside_zones(db: Session, latitude: float, longitude: float) -> bool:
    """Fuera si hay zonas activas y no está en ninguna. Sin zonas no hay alertas."""
    fences = db.execute(
        select(func.ST_DWithin(Geofence.location, point(latitude, longitude), Geofence.radius_m)).where(
            Geofence.is_active
        )
    ).all()
    return bool(fences) and not any(inside for (inside,) in fences)


def record_position(db: Session, device: GpsDevice, data: PositionIn) -> PositionAck:
    now = now_utc()
    if device.last_seen_at and now - device.last_seen_at < MIN_REPORT_INTERVAL:
        raise TooManyReports("Reporta como máximo una posición por segundo.")
    device.last_latitude = data.latitude
    device.last_longitude = data.longitude
    device.last_battery_pct = data.battery_pct
    device.last_seen_at = now
    db.add(
        GpsPosition(
            device_id=device.id,
            latitude=data.latitude,
            longitude=data.longitude,
            battery_pct=data.battery_pct,
            recorded_at=now,
        )
    )
    outside = is_outside_zones(db, data.latitude, data.longitude)
    alert = db.scalar(
        select(GeofenceAlert).where(GeofenceAlert.device_id == device.id, GeofenceAlert.closed_at.is_(None))
    )
    if outside and alert is None:
        db.add(GeofenceAlert(device_id=device.id, latitude=data.latitude, longitude=data.longitude, opened_at=now))
    elif not outside and alert is not None:
        alert.closed_at = now
    db.commit()
    return PositionAck(received_at=now, outside_zone=outside)


# ── Flota ────────────────────────────────────────────────────────────────────


def _trails(db: Session, device_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[GeoPointOut]]:
    if not device_ids:
        return {}
    ranked = (
        select(
            GpsPosition.device_id,
            GpsPosition.latitude,
            GpsPosition.longitude,
            GpsPosition.recorded_at,
            func.row_number()
            .over(partition_by=GpsPosition.device_id, order_by=GpsPosition.recorded_at.desc())
            .label("n"),
        )
        .where(GpsPosition.device_id.in_(device_ids))
        .subquery()
    )
    rows = db.execute(
        select(ranked.c.device_id, ranked.c.latitude, ranked.c.longitude)
        .where(ranked.c.n <= TRAIL_POINTS)
        .order_by(ranked.c.device_id, ranked.c.recorded_at)
    )
    trails: dict[uuid.UUID, list[GeoPointOut]] = {}
    for device_id, latitude, longitude in rows:
        trails.setdefault(device_id, []).append(GeoPointOut(lat=float(latitude), lng=float(longitude)))
    return trails


def _busy_owners(db: Session) -> tuple[set[uuid.UUID], set[uuid.UUID]]:
    couriers = set(
        db.scalars(
            select(Delivery.courier_id).where(
                Delivery.courier_id.is_not(None),
                Delivery.status.in_((DeliveryStatus.PICKING_UP, DeliveryStatus.IN_TRANSIT)),
            )
        )
    )
    units = set(db.scalars(select(Rental.rental_unit_id).where(Rental.status == RentalStatus.ACTIVE)))
    return couriers, units


def fleet_snapshot(db: Session) -> FleetSnapshotOut:
    now = now_utc()
    devices = db.scalars(select(GpsDevice).where(GpsDevice.is_active).order_by(GpsDevice.code)).all()
    reporting = [d for d in devices if d.last_seen_at is not None]
    trails = _trails(db, [d.id for d in reporting])
    open_alerts = set(db.scalars(select(GeofenceAlert.device_id).where(GeofenceAlert.closed_at.is_(None))))
    busy_couriers, busy_units = _busy_owners(db)
    maintenance = set(db.scalars(select(RentalUnit.id).where(RentalUnit.status == RentalUnitStatus.MAINTENANCE)))

    def status_of(device: GpsDevice) -> str:
        if device.id in open_alerts:
            return "incidencia"
        if device.rental_unit_id in maintenance:
            return "mantenimiento"
        if device.courier_id in busy_couriers or device.rental_unit_id in busy_units:
            return "en_uso"
        return "disponible"

    assets = []
    for device in reporting:
        trail = trails.get(device.id, [])
        assets.append(
            FleetAssetOut(
                id=device.id,
                code=device.code,
                kind=device.kind,
                status=status_of(device),
                position=GeoPointOut(lat=float(device.last_latitude), lng=float(device.last_longitude)),
                trail=trail[:-1],  # la última es la posición actual
                battery_pct=device.last_battery_pct,
                hub_id=device.branch_id,
                updated_at=device.last_seen_at,
                stale=now - device.last_seen_at > STALE_AFTER,
                outside_zone=device.id in open_alerts,
            )
        )
    return FleetSnapshotOut(
        assets=assets,
        zones=[z for z in list_geofences(db) if z.is_active],
        open_alerts=len(open_alerts),
        active_devices=len(devices),
        at=now,
    )


def courier_position(db: Session, courier_id: uuid.UUID) -> tuple[float, float, datetime] | None:
    """Última posición reciente del domiciliario, para el seguimiento público."""
    device = db.scalar(
        select(GpsDevice)
        .where(
            GpsDevice.courier_id == courier_id,
            GpsDevice.is_active,
            GpsDevice.last_seen_at >= now_utc() - NEAREST_MAX_AGE,
        )
        .order_by(GpsDevice.last_seen_at.desc())
    )
    if device is None:
        return None
    return float(device.last_latitude), float(device.last_longitude), device.last_seen_at


def nearest_courier(db: Session, branch_id: uuid.UUID) -> uuid.UUID | None:
    """RF 5.1: domiciliario activo con GPS reciente más cercano a la sucursal que despacha."""
    return db.scalar(
        select(GpsDevice.courier_id)
        .join(Courier, Courier.id == GpsDevice.courier_id)
        .join(Branch, Branch.id == branch_id)
        .where(
            Courier.is_active,
            GpsDevice.is_active,
            GpsDevice.last_seen_at >= now_utc() - NEAREST_MAX_AGE,
        )
        .order_by(func.ST_Distance(Branch.location, point(GpsDevice.last_latitude, GpsDevice.last_longitude)))
        .limit(1)
    )


# ── Dispositivos ─────────────────────────────────────────────────────────────


def _device_out(db: Session, device: GpsDevice) -> dict:
    branch = db.get(Branch, device.branch_id) if device.branch_id else None
    courier = db.get(Courier, device.courier_id) if device.courier_id else None
    unit = db.get(RentalUnit, device.rental_unit_id) if device.rental_unit_id else None
    return {
        "id": device.id,
        "code": device.code,
        "kind": device.kind,
        "is_active": device.is_active,
        "branch_id": device.branch_id,
        "branch_name": branch.name if branch else None,
        "courier_id": device.courier_id,
        "courier_name": courier.name if courier else None,
        "rental_unit_id": device.rental_unit_id,
        "rental_unit_code": unit.code if unit else None,
        "last_seen_at": device.last_seen_at,
    }


def list_devices(db: Session) -> list[GpsDeviceOut]:
    devices = db.scalars(select(GpsDevice).order_by(GpsDevice.is_active.desc(), GpsDevice.code))
    return [GpsDeviceOut(**_device_out(db, d)) for d in devices]


def create_device(db: Session, data: GpsDeviceCreateIn) -> GpsDeviceCreatedOut:
    if data.courier_id and data.rental_unit_id:
        raise ServiceError("Un dispositivo va en un domiciliario o en una unidad, no en ambos.")
    token = new_token()
    device = GpsDevice(
        code=data.code.strip().upper(),
        kind=data.kind,
        token_hash=hash_token(token),
        branch_id=data.branch_id,
        courier_id=data.courier_id,
        rental_unit_id=data.rental_unit_id,
    )
    db.add(device)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ConflictError("Ya existe un dispositivo con ese código, o sus datos no son válidos.") from error
    return GpsDeviceCreatedOut(**_device_out(db, device), token=token)


def set_device_active(db: Session, device_id: uuid.UUID, is_active: bool) -> GpsDeviceOut:
    device = db.get(GpsDevice, device_id)
    if device is None:
        raise NotFoundError("El dispositivo no existe.")
    device.is_active = is_active
    db.commit()
    return GpsDeviceOut(**_device_out(db, device))


# ── Zonas ────────────────────────────────────────────────────────────────────


def _fence_out(fence: Geofence) -> GeofenceOut:
    return GeofenceOut(
        id=fence.id,
        name=fence.name,
        latitude=float(fence.latitude),
        longitude=float(fence.longitude),
        radius_m=fence.radius_m,
        is_active=fence.is_active,
    )


def list_geofences(db: Session) -> list[GeofenceOut]:
    return [_fence_out(f) for f in db.scalars(select(Geofence).order_by(Geofence.is_active.desc(), Geofence.name))]


def create_geofence(db: Session, data: GeofenceCreateIn) -> GeofenceOut:
    fence = Geofence(name=data.name.strip(), latitude=data.latitude, longitude=data.longitude, radius_m=data.radius_m)
    db.add(fence)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ConflictError("Ya existe una zona con ese nombre.") from error
    return _fence_out(fence)


def set_geofence_active(db: Session, fence_id: uuid.UUID, is_active: bool) -> GeofenceOut:
    fence = db.get(Geofence, fence_id)
    if fence is None:
        raise NotFoundError("La zona no existe.")
    fence.is_active = is_active
    db.commit()
    return _fence_out(fence)


def list_alerts(db: Session, *, only_open: bool) -> list[GeofenceAlertOut]:
    stmt = select(GeofenceAlert).order_by(GeofenceAlert.opened_at.desc()).limit(100)
    if only_open:
        stmt = stmt.where(GeofenceAlert.closed_at.is_(None))
    return [
        GeofenceAlertOut(
            id=a.id,
            device_code=a.device.code,
            latitude=float(a.latitude),
            longitude=float(a.longitude),
            opened_at=a.opened_at,
            closed_at=a.closed_at,
        )
        for a in db.scalars(stmt)
    ]
