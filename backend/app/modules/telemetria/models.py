from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Computed,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey
from app.models.enums import AssetKind, sql_in


class GpsDevice(UUIDPrimaryKey, Timestamps, Base):
    """Aparato o app que reporta posiciones. Se autentica con su token, no con una sesión."""

    __tablename__ = "gps_devices"
    __table_args__ = (
        CheckConstraint(f"kind IN {sql_in(AssetKind)}", name="valid_kind"),
        CheckConstraint("courier_id IS NULL OR rental_unit_id IS NULL", name="single_owner"),
    )

    code: Mapped[str] = mapped_column(String(30), unique=True)
    kind: Mapped[str] = mapped_column(String(20))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("branches.id", ondelete="SET NULL"))
    courier_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("couriers.id", ondelete="SET NULL"), index=True)
    rental_unit_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("rental_units.id", ondelete="SET NULL"), index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    last_latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    last_longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    last_battery_pct: Mapped[int | None] = mapped_column(Integer)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class GpsPosition(UUIDPrimaryKey, Base):
    """Historial de posiciones."""

    __tablename__ = "gps_positions"
    __table_args__ = (Index("ix_gps_positions_device_recorded", "device_id", "recorded_at"),)

    device_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("gps_devices.id", ondelete="CASCADE"))
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    battery_pct: Mapped[int | None] = mapped_column(Integer)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Geofence(UUIDPrimaryKey, Timestamps, Base):
    """Zona permitida: un círculo. Un activo fuera de todas las zonas activas genera una alerta."""

    __tablename__ = "geofences"
    __table_args__ = (CheckConstraint("radius_m > 0", name="radius_positive"),)

    name: Mapped[str] = mapped_column(String(80), unique=True)
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    radius_m: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    location: Mapped[Any] = mapped_column(
        Geography("POINT", srid=4326, spatial_index=False),
        Computed(
            "ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geography",
            persisted=True,
        ),
    )


class GeofenceAlert(UUIDPrimaryKey, Base):
    """Se abre al salir de las zonas y se cierra sola al volver."""

    __tablename__ = "geofence_alerts"
    __table_args__ = (
        Index("uq_geofence_alerts_open", "device_id", unique=True, postgresql_where=text("closed_at IS NULL")),
    )

    device_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("gps_devices.id", ondelete="CASCADE"))
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    device: Mapped[GpsDevice] = relationship(lazy="joined")
