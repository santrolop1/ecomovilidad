from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING, Any

from geoalchemy2 import Geography
from sqlalchemy import Boolean, CheckConstraint, Computed, Index, Numeric, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey

from .enums import SERVICE_AREA_CITIES, BranchService, sql_in

if TYPE_CHECKING:
    from .inventory import Inventory


class Branch(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "branches"
    __table_args__ = (
        CheckConstraint(f"city IN {sql_in(SERVICE_AREA_CITIES)}", name="city_in_service_area"),
        CheckConstraint("latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180", name="valid_coordinates"),
        CheckConstraint(f"services <@ ARRAY{list(s.value for s in BranchService)}::varchar[]", name="known_services"),
        Index("ix_branches_location", "location", postgresql_using="gist"),
    )

    slug: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(80))
    address: Mapped[str] = mapped_column(String(160))
    neighborhood: Mapped[str] = mapped_column(String(80))
    city: Mapped[str] = mapped_column(String(40))
    phone: Mapped[str] = mapped_column(String(20))
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    # Punto geográfico derivado de latitud/longitud: nunca se desincroniza.
    # Listo para consultas espaciales (ST_DWithin, ST_Distance) y geocercas futuras.
    location: Mapped[Any] = mapped_column(
        Geography("POINT", srid=4326, spatial_index=False),
        Computed(
            "ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geography",
            persisted=True,
        ),
    )
    # [{"days", "opens", "closes"}]
    opening_hours: Mapped[list[dict[str, str]]] = mapped_column(JSONB, default=list, server_default="[]")
    services: Mapped[list[str]] = mapped_column(ARRAY(String(20)), default=list, server_default="{}")
    # Marca explícita para no presentar datos inventados como reales.
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    inventory: Mapped[list[Inventory]] = relationship(back_populates="branch")
