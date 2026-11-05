from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field

from app.core.api_model import ApiModel
from app.models.enums import AssetKind

# Colombia: descarta coordenadas absurdas sin atar el sistema al área metropolitana.
Latitude = Field(ge=-5, le=14)
Longitude = Field(ge=-80, le=-66)


class PositionIn(ApiModel):
    latitude: float = Latitude
    longitude: float = Longitude
    battery_pct: int | None = Field(default=None, ge=0, le=100)


class PositionAck(ApiModel):
    received_at: datetime
    outside_zone: bool


class GpsDeviceOut(ApiModel):
    id: uuid.UUID
    code: str
    kind: AssetKind
    is_active: bool
    branch_id: uuid.UUID | None
    branch_name: str | None
    courier_id: uuid.UUID | None
    courier_name: str | None
    rental_unit_id: uuid.UUID | None
    rental_unit_code: str | None
    last_seen_at: datetime | None


class GpsDeviceCreatedOut(GpsDeviceOut):
    """El token solo se muestra al crearlo; en la base queda su hash."""

    token: str


class GpsDeviceCreateIn(ApiModel):
    code: str = Field(min_length=2, max_length=30)
    kind: AssetKind
    branch_id: uuid.UUID | None = None
    courier_id: uuid.UUID | None = None
    rental_unit_id: uuid.UUID | None = None


class GpsDeviceUpdateIn(ApiModel):
    is_active: bool


class GeoPointOut(ApiModel):
    lat: float
    lng: float


class FleetAssetOut(ApiModel):
    id: uuid.UUID
    code: str
    kind: AssetKind
    status: Literal["disponible", "en_uso", "mantenimiento", "incidencia"]
    position: GeoPointOut
    trail: list[GeoPointOut]
    battery_pct: int | None
    hub_id: uuid.UUID | None
    updated_at: datetime
    stale: bool
    outside_zone: bool


class GeofenceOut(ApiModel):
    id: uuid.UUID
    name: str
    latitude: float
    longitude: float
    radius_m: int
    is_active: bool


class GeofenceCreateIn(ApiModel):
    name: str = Field(min_length=3, max_length=80)
    latitude: float = Latitude
    longitude: float = Longitude
    radius_m: int = Field(ge=50, le=100_000)


class GeofenceUpdateIn(ApiModel):
    is_active: bool


class GeofenceAlertOut(ApiModel):
    id: uuid.UUID
    device_code: str
    latitude: float
    longitude: float
    opened_at: datetime
    closed_at: datetime | None


class FleetSnapshotOut(ApiModel):
    assets: list[FleetAssetOut]
    zones: list[GeofenceOut]
    open_alerts: int
    active_devices: int
    at: datetime
