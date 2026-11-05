"""Dispositivos GPS, posiciones, zonas y alertas (CU-10, CU-11).

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-05 14:00:00
"""

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "gps_devices",
        sa.Column("code", sa.String(length=30), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("branch_id", sa.UUID(), nullable=True),
        sa.Column("courier_id", sa.UUID(), nullable=True),
        sa.Column("rental_unit_id", sa.UUID(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("last_latitude", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("last_longitude", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("last_battery_pct", sa.Integer(), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "kind IN ('bicicleta', 'patineta', 'dron', 'domicilio')", name=op.f("ck_gps_devices_valid_kind")
        ),
        sa.CheckConstraint("courier_id IS NULL OR rental_unit_id IS NULL", name=op.f("ck_gps_devices_single_owner")),
        sa.ForeignKeyConstraint(
            ["branch_id"], ["branches.id"], name=op.f("fk_gps_devices_branch_id_branches"), ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["courier_id"], ["couriers.id"], name=op.f("fk_gps_devices_courier_id_couriers"), ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["rental_unit_id"],
            ["rental_units.id"],
            name=op.f("fk_gps_devices_rental_unit_id_rental_units"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gps_devices")),
        sa.UniqueConstraint("code", name=op.f("uq_gps_devices_code")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_gps_devices_token_hash")),
    )
    op.create_index(op.f("ix_gps_devices_courier_id"), "gps_devices", ["courier_id"])
    op.create_index(op.f("ix_gps_devices_rental_unit_id"), "gps_devices", ["rental_unit_id"])
    op.create_table(
        "gps_positions",
        sa.Column("device_id", sa.UUID(), nullable=False),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("battery_pct", sa.Integer(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["device_id"], ["gps_devices.id"], name=op.f("fk_gps_positions_device_id_gps_devices"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gps_positions")),
    )
    op.create_index("ix_gps_positions_device_recorded", "gps_positions", ["device_id", "recorded_at"])
    op.create_table(
        "geofences",
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("radius_m", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "location",
            geoalchemy2.types.Geography(
                geometry_type="POINT", srid=4326, spatial_index=False, from_text="ST_GeogFromText", name="geography"
            ),
            sa.Computed(
                "ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geography", persisted=True
            ),
            nullable=False,
        ),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("radius_m > 0", name=op.f("ck_geofences_radius_positive")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_geofences")),
        sa.UniqueConstraint("name", name=op.f("uq_geofences_name")),
    )
    op.create_table(
        "geofence_alerts",
        sa.Column("device_id", sa.UUID(), nullable=False),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("opened_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["device_id"], ["gps_devices.id"], name=op.f("fk_geofence_alerts_device_id_gps_devices"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_geofence_alerts")),
    )
    op.create_index(op.f("ix_geofence_alerts_opened_at"), "geofence_alerts", ["opened_at"])
    op.create_index(
        "uq_geofence_alerts_open",
        "geofence_alerts",
        ["device_id"],
        unique=True,
        postgresql_where=sa.text("closed_at IS NULL"),
    )
    # Zona inicial: el área metropolitana de Bucaramanga. Editable desde el panel.
    op.execute(
        "INSERT INTO geofences (name, latitude, longitude, radius_m) "
        "VALUES ('Área metropolitana de Bucaramanga', 7.060000, -73.110000, 16000)"
    )


def downgrade() -> None:
    op.drop_table("geofence_alerts")
    op.drop_table("geofences")
    op.drop_table("gps_positions")
    op.drop_table("gps_devices")
