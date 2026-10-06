"""Reservas temporales de carrito (RF 6.2), tokens de recuperación de contraseña,
intentos de inicio de sesión y evidencia de consentimiento (Ley 1581).

Nota de datos: las líneas de carrito activas creadas antes de esta migración no
tienen reserva; el backend las retira en la primera limpieza (invariante:
cantidad de la línea = unidades reservadas).

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-06 06:18:15.147886
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "login_attempts",
        sa.Column("email_hash", sa.String(length=64), nullable=False),
        sa.Column("ip_address", sa.String(length=45), nullable=False),
        sa.Column("succeeded", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_login_attempts")),
    )
    op.create_index(op.f("ix_login_attempts_created_at"), "login_attempts", ["created_at"], unique=False)
    op.create_index("ix_login_attempts_email_created", "login_attempts", ["email_hash", "created_at"], unique=False)
    op.create_index("ix_login_attempts_ip_created", "login_attempts", ["ip_address", "created_at"], unique=False)
    op.create_table(
        "password_reset_tokens",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_password_reset_tokens_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_password_reset_tokens")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_password_reset_tokens_token_hash")),
    )
    op.create_index(op.f("ix_password_reset_tokens_user_id"), "password_reset_tokens", ["user_id"], unique=False)
    op.create_table(
        "consent_records",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("purpose", sa.String(length=20), nullable=False),
        sa.Column("policy_version", sa.String(length=20), nullable=False),
        sa.Column("order_id", sa.UUID(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.CheckConstraint(
            "purpose <> 'pedido' OR order_id IS NOT NULL", name=op.f("ck_consent_records_order_consent_has_order")
        ),
        sa.CheckConstraint("purpose IN ('registro', 'pedido')", name=op.f("ck_consent_records_valid_purpose")),
        sa.ForeignKeyConstraint(
            ["order_id"], ["orders.id"], name=op.f("fk_consent_records_order_id_orders"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_consent_records_user_id_users"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_consent_records")),
    )
    op.create_index(op.f("ix_consent_records_user_id"), "consent_records", ["user_id"], unique=False)
    op.create_table(
        "cart_reservations",
        sa.Column("cart_item_id", sa.UUID(), nullable=False),
        sa.Column("inventory_id", sa.UUID(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.CheckConstraint("quantity > 0", name=op.f("ck_cart_reservations_quantity_positive")),
        sa.ForeignKeyConstraint(
            ["cart_item_id"],
            ["cart_items.id"],
            name=op.f("fk_cart_reservations_cart_item_id_cart_items"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["inventory_id"],
            ["inventory.id"],
            name=op.f("fk_cart_reservations_inventory_id_inventory"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_cart_reservations")),
        sa.UniqueConstraint("cart_item_id", "inventory_id", name="uq_cart_reservations_item_inventory"),
    )
    op.create_index(op.f("ix_cart_reservations_cart_item_id"), "cart_reservations", ["cart_item_id"], unique=False)
    op.create_index(op.f("ix_cart_reservations_expires_at"), "cart_reservations", ["expires_at"], unique=False)
    op.create_index(op.f("ix_cart_reservations_inventory_id"), "cart_reservations", ["inventory_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_cart_reservations_inventory_id"), table_name="cart_reservations")
    op.drop_index(op.f("ix_cart_reservations_expires_at"), table_name="cart_reservations")
    op.drop_index(op.f("ix_cart_reservations_cart_item_id"), table_name="cart_reservations")
    op.drop_table("cart_reservations")
    op.drop_index(op.f("ix_consent_records_user_id"), table_name="consent_records")
    op.drop_table("consent_records")
    op.drop_index(op.f("ix_password_reset_tokens_user_id"), table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")
    op.drop_index("ix_login_attempts_ip_created", table_name="login_attempts")
    op.drop_index("ix_login_attempts_email_created", table_name="login_attempts")
    op.drop_index(op.f("ix_login_attempts_created_at"), table_name="login_attempts")
    op.drop_table("login_attempts")
