"""Domiciliarios, domicilios e historial de estados (CU-07, CU-08, CU-14).

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-05 13:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "couriers",
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_couriers")),
    )
    op.create_table(
        "deliveries",
        sa.Column("order_id", sa.UUID(), nullable=False),
        sa.Column("courier_id", sa.UUID(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="creado", nullable=False),
        sa.Column("tracking_token", sa.String(length=64), nullable=False),
        sa.Column("confirmation_code", sa.String(length=6), nullable=False),
        sa.Column("proof_method", sa.String(length=10), nullable=True),
        sa.Column("signer_name", sa.String(length=120), nullable=True),
        sa.Column("signature_image", sa.Text(), nullable=True),
        sa.Column("failure_reason", sa.String(length=300), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('creado', 'asignado', 'en_recogida', 'en_transito', 'entregado', 'fallido')",
            name=op.f("ck_deliveries_valid_status"),
        ),
        sa.CheckConstraint(
            "proof_method IS NULL OR proof_method IN ('qr', 'firma')", name=op.f("ck_deliveries_valid_proof")
        ),
        sa.CheckConstraint(
            "status <> 'entregado' OR proof_method IS NOT NULL", name=op.f("ck_deliveries_delivered_requires_proof")
        ),
        sa.ForeignKeyConstraint(
            ["courier_id"], ["couriers.id"], name=op.f("fk_deliveries_courier_id_couriers"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["order_id"], ["orders.id"], name=op.f("fk_deliveries_order_id_orders"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_deliveries")),
        sa.UniqueConstraint("order_id", name=op.f("uq_deliveries_order_id")),
        sa.UniqueConstraint("tracking_token", name=op.f("uq_deliveries_tracking_token")),
    )
    op.create_index(op.f("ix_deliveries_courier_id"), "deliveries", ["courier_id"])
    op.create_index(op.f("ix_deliveries_status"), "deliveries", ["status"])
    op.create_table(
        "delivery_events",
        sa.Column("delivery_id", sa.UUID(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("note", sa.String(length=300), nullable=True),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["delivery_id"],
            ["deliveries.id"],
            name=op.f("fk_delivery_events_delivery_id_deliveries"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_delivery_events_user_id_users"), ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_delivery_events")),
    )
    op.create_index(op.f("ix_delivery_events_delivery_id"), "delivery_events", ["delivery_id"])
    # Pedidos ya pagados a domicilio: reciben su domicilio para poder entregarse.
    op.execute(
        """
        WITH created AS (
            INSERT INTO deliveries (order_id, tracking_token, confirmation_code)
            SELECT id, replace(gen_random_uuid()::text, '-', ''), lpad(floor(random() * 1000000)::int::text, 6, '0')
            FROM orders WHERE status = 'paid' AND fulfillment_method = 'domicilio'
            RETURNING id
        )
        INSERT INTO delivery_events (delivery_id, status) SELECT id, 'creado' FROM created
        """
    )


def downgrade() -> None:
    op.drop_table("delivery_events")
    op.drop_table("deliveries")
    op.drop_table("couriers")
