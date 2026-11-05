"""Uso, umbrales y bitácora inmutable de la flota (CU-12, RF 3.1 a 3.3).

Revision ID: 0011
Revises: 0010
Create Date: 2026-11-05 16:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("rental_units", sa.Column("usage_unit", sa.String(length=10), server_default="km", nullable=False))
    op.add_column(
        "rental_units", sa.Column("usage_value", sa.Numeric(precision=10, scale=1), server_default="0", nullable=False)
    )
    op.add_column("rental_units", sa.Column("service_threshold", sa.Integer(), server_default="500", nullable=False))
    op.create_check_constraint(
        op.f("ck_rental_units_valid_usage_unit"), "rental_units", "usage_unit IN ('km', 'horas')"
    )
    op.create_check_constraint(op.f("ck_rental_units_usage_non_negative"), "rental_units", "usage_value >= 0")
    op.create_check_constraint(op.f("ck_rental_units_threshold_positive"), "rental_units", "service_threshold > 0")
    # Las unidades de drones existentes se miden en horas de vuelo.
    op.execute(
        """
        UPDATE rental_units SET usage_unit = 'horas', service_threshold = 50
        WHERE product_id IN (
            SELECT p.id FROM products p JOIN categories c ON c.id = p.category_id WHERE c.slug = 'drones'
        )
        """
    )
    op.create_table(
        "maintenance_logs",
        sa.Column("unit_id", sa.UUID(), nullable=False),
        sa.Column("kind", sa.String(length=10), nullable=False),
        sa.Column("usage_delta", sa.Numeric(precision=10, scale=1), nullable=True),
        sa.Column("usage_after", sa.Numeric(precision=10, scale=1), nullable=False),
        sa.Column("note", sa.String(length=300), nullable=True),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.CheckConstraint(
            "kind IN ('uso', 'bloqueo', 'inicio', 'fin', 'umbral')", name=op.f("ck_maintenance_logs_valid_kind")
        ),
        sa.ForeignKeyConstraint(
            ["unit_id"], ["rental_units.id"], name=op.f("fk_maintenance_logs_unit_id_rental_units"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_maintenance_logs_user_id_users"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_maintenance_logs")),
    )
    op.create_index(op.f("ix_maintenance_logs_unit_id"), "maintenance_logs", ["unit_id"])
    # RF 3.3: ni la aplicación ni un error pueden reescribir la bitácora.
    op.execute(
        """
        CREATE FUNCTION maintenance_logs_immutable() RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'La bitácora de mantenimiento no se puede modificar';
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute(
        """
        CREATE TRIGGER maintenance_logs_no_changes
        BEFORE UPDATE OR DELETE ON maintenance_logs
        FOR EACH ROW EXECUTE FUNCTION maintenance_logs_immutable()
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER maintenance_logs_no_changes ON maintenance_logs")
    op.execute("DROP FUNCTION maintenance_logs_immutable()")
    op.drop_table("maintenance_logs")
    op.drop_constraint(op.f("ck_rental_units_threshold_positive"), "rental_units", type_="check")
    op.drop_constraint(op.f("ck_rental_units_usage_non_negative"), "rental_units", type_="check")
    op.drop_constraint(op.f("ck_rental_units_valid_usage_unit"), "rental_units", type_="check")
    op.drop_column("rental_units", "service_threshold")
    op.drop_column("rental_units", "usage_value")
    op.drop_column("rental_units", "usage_unit")
