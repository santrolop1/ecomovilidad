"""Domicilios con dron, salida y entrada en sucursal y mantenimiento por tiempo.

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-15 15:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── Domicilios con dron ──────────────────────────────────────────────────
    op.add_column(
        "deliveries", sa.Column("carrier", sa.String(length=15), server_default="domiciliario", nullable=False)
    )
    op.add_column("deliveries", sa.Column("drone_device_id", sa.UUID(), nullable=True))
    for column in ("destination_latitude", "destination_longitude", "drop_latitude", "drop_longitude"):
        op.add_column("deliveries", sa.Column(column, sa.Numeric(precision=9, scale=6), nullable=True))
    op.add_column("deliveries", sa.Column("drop_distance_m", sa.Integer(), nullable=True))
    op.add_column("deliveries", sa.Column("dropped_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("deliveries", sa.Column("customer_confirmed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key(
        op.f("fk_deliveries_drone_device_id_gps_devices"),
        "deliveries",
        "gps_devices",
        ["drone_device_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(op.f("ix_deliveries_drone_device_id"), "deliveries", ["drone_device_id"])
    op.drop_constraint(op.f("ck_deliveries_valid_proof"), "deliveries", type_="check")
    op.create_check_constraint(
        op.f("ck_deliveries_valid_proof"),
        "deliveries",
        "proof_method IS NULL OR proof_method IN ('qr', 'firma', 'dron')",
    )
    op.create_check_constraint(op.f("ck_deliveries_valid_carrier"), "deliveries", "carrier IN ('domiciliario', 'dron')")
    op.create_check_constraint(
        op.f("ck_deliveries_courier_without_drone"), "deliveries", "carrier = 'dron' OR drone_device_id IS NULL"
    )
    op.create_check_constraint(
        op.f("ck_deliveries_drone_without_courier"), "deliveries", "carrier = 'domiciliario' OR courier_id IS NULL"
    )
    op.create_check_constraint(
        op.f("ck_deliveries_drone_requires_destination"),
        "deliveries",
        "drone_device_id IS NULL OR (destination_latitude IS NOT NULL AND destination_longitude IS NOT NULL)",
    )
    op.create_check_constraint(
        op.f("ck_deliveries_drone_proof_requires_drop"),
        "deliveries",
        "proof_method IS DISTINCT FROM 'dron' OR dropped_at IS NOT NULL",
    )

    # ── Salida y entrada del vehículo en la sucursal ─────────────────────────
    op.add_column("rentals", sa.Column("checked_out_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("rentals", sa.Column("checked_out_by", sa.UUID(), nullable=True))
    op.add_column("rentals", sa.Column("returned_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("rentals", sa.Column("returned_by", sa.UUID(), nullable=True))
    op.add_column("rentals", sa.Column("return_usage", sa.Numeric(precision=10, scale=1), nullable=True))
    op.create_foreign_key(
        op.f("fk_rentals_checked_out_by_users"), "rentals", "users", ["checked_out_by"], ["id"], ondelete="RESTRICT"
    )
    op.create_foreign_key(
        op.f("fk_rentals_returned_by_users"), "rentals", "users", ["returned_by"], ["id"], ondelete="RESTRICT"
    )
    # Los alquileres ya entregados o devueltos conservan su historia aproximada.
    op.execute("UPDATE rentals SET checked_out_at = updated_at WHERE status IN ('active', 'completed')")
    op.execute("UPDATE rentals SET returned_at = updated_at WHERE status = 'completed'")
    op.create_check_constraint(
        op.f("ck_rentals_return_after_checkout"), "rentals", "returned_at IS NULL OR checked_out_at IS NOT NULL"
    )

    # ── Mantenimiento por tiempo ─────────────────────────────────────────────
    op.add_column("rental_units", sa.Column("service_interval_days", sa.Integer(), server_default="90", nullable=False))
    op.add_column(
        "rental_units",
        sa.Column("last_service_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_check_constraint(op.f("ck_rental_units_interval_positive"), "rental_units", "service_interval_days > 0")
    # Los drones se revisan cada 60 días; la última revisión es el último mantenimiento terminado.
    op.execute(
        """
        UPDATE rental_units SET service_interval_days = 60
        WHERE usage_unit = 'horas'
        """
    )
    op.execute(
        """
        UPDATE rental_units u SET last_service_at = COALESCE(
            (SELECT max(l.created_at) FROM maintenance_logs l WHERE l.unit_id = u.id AND l.kind = 'fin'),
            u.created_at
        )
        """
    )


def downgrade() -> None:
    op.drop_constraint(op.f("ck_rental_units_interval_positive"), "rental_units", type_="check")
    op.drop_column("rental_units", "last_service_at")
    op.drop_column("rental_units", "service_interval_days")

    op.drop_constraint(op.f("ck_rentals_return_after_checkout"), "rentals", type_="check")
    op.drop_constraint(op.f("fk_rentals_returned_by_users"), "rentals", type_="foreignkey")
    op.drop_constraint(op.f("fk_rentals_checked_out_by_users"), "rentals", type_="foreignkey")
    for column in ("return_usage", "returned_by", "returned_at", "checked_out_by", "checked_out_at"):
        op.drop_column("rentals", column)

    op.execute("UPDATE deliveries SET proof_method = 'qr' WHERE proof_method = 'dron'")
    for name in (
        "drone_proof_requires_drop",
        "drone_requires_destination",
        "drone_without_courier",
        "courier_without_drone",
        "valid_carrier",
        "valid_proof",
    ):
        op.drop_constraint(op.f(f"ck_deliveries_{name}"), "deliveries", type_="check")
    op.create_check_constraint(
        op.f("ck_deliveries_valid_proof"), "deliveries", "proof_method IS NULL OR proof_method IN ('qr', 'firma')"
    )
    op.drop_index(op.f("ix_deliveries_drone_device_id"), table_name="deliveries")
    op.drop_constraint(op.f("fk_deliveries_drone_device_id_gps_devices"), "deliveries", type_="foreignkey")
    for column in (
        "customer_confirmed_at",
        "dropped_at",
        "drop_distance_m",
        "drop_longitude",
        "drop_latitude",
        "destination_longitude",
        "destination_latitude",
        "drone_device_id",
        "carrier",
    ):
        op.drop_column("deliveries", column)
