"""Solicitudes de reembolso (CU-15).

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-19 18:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "refund_requests",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("order_id", sa.UUID(), nullable=True),
        sa.Column("rental_id", sa.UUID(), nullable=True),
        sa.Column("reason", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="abierta", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.CheckConstraint(
            "(order_id IS NOT NULL) <> (rental_id IS NOT NULL)", name=op.f("ck_refund_requests_one_target")
        ),
        sa.CheckConstraint("status IN ('abierta', 'reembolsada')", name=op.f("ck_refund_requests_valid_status")),
        sa.ForeignKeyConstraint(
            ["order_id"], ["orders.id"], name=op.f("fk_refund_requests_order_id_orders"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["rental_id"], ["rentals.id"], name=op.f("fk_refund_requests_rental_id_rentals"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_refund_requests_user_id_users"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_refund_requests")),
    )
    op.create_index(op.f("ix_refund_requests_order_id"), "refund_requests", ["order_id"], unique=False)
    op.create_index(op.f("ix_refund_requests_rental_id"), "refund_requests", ["rental_id"], unique=False)
    op.create_index(op.f("ix_refund_requests_user_id"), "refund_requests", ["user_id"], unique=False)
    op.create_index(
        "uq_refund_requests_order_open",
        "refund_requests",
        ["order_id"],
        unique=True,
        postgresql_where=sa.text("status = 'abierta'"),
    )
    op.create_index(
        "uq_refund_requests_rental_open",
        "refund_requests",
        ["rental_id"],
        unique=True,
        postgresql_where=sa.text("status = 'abierta'"),
    )


def downgrade() -> None:
    op.drop_table("refund_requests")
