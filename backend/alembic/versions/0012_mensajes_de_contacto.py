"""Mensajes del formulario de contacto.

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-09 10:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "contact_messages",
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("topic", sa.String(length=20), nullable=False),
        sa.Column("message", sa.String(length=2000), nullable=False),
        sa.Column("status", sa.String(length=10), server_default="nuevo", nullable=False),
        sa.Column("policy_version", sa.String(length=20), nullable=False),
        sa.Column("ip_hash", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.CheckConstraint("status IN ('nuevo', 'atendido')", name=op.f("ck_contact_messages_valid_status")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_contact_messages")),
    )
    op.create_index(op.f("ix_contact_messages_created_at"), "contact_messages", ["created_at"])
    op.create_index(op.f("ix_contact_messages_status"), "contact_messages", ["status"])
    op.create_index("ix_contact_messages_ip_hash_created_at", "contact_messages", ["ip_hash", "created_at"])
    op.create_index("ix_contact_messages_email_created_at", "contact_messages", ["email", "created_at"])


def downgrade() -> None:
    op.drop_table("contact_messages")
