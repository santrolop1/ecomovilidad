"""Registro de entradas y salidas de inventario (CU-13).

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-05 11:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "inventory_movements",
        sa.Column("inventory_id", sa.UUID(), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("balance_after", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=200), nullable=True),
        sa.Column("order_id", sa.UUID(), nullable=True),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.CheckConstraint("balance_after >= 0", name=op.f("ck_inventory_movements_balance_non_negative")),
        sa.CheckConstraint(
            "kind IN ('saldo_inicial', 'entrada', 'salida', 'venta', 'devolucion')",
            name=op.f("ck_inventory_movements_valid_kind"),
        ),
        sa.CheckConstraint("quantity <> 0", name=op.f("ck_inventory_movements_quantity_non_zero")),
        sa.ForeignKeyConstraint(
            ["inventory_id"],
            ["inventory.id"],
            name=op.f("fk_inventory_movements_inventory_id_inventory"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["order_id"], ["orders.id"], name=op.f("fk_inventory_movements_order_id_orders"), ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_inventory_movements_user_id_users"), ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_inventory_movements")),
    )
    for column in ("created_at", "inventory_id", "order_id", "user_id"):
        op.create_index(op.f(f"ix_inventory_movements_{column}"), "inventory_movements", [column])
    # Lo que ya existe queda como punto de partida para que los saldos cuadren.
    op.execute(
        """
        INSERT INTO inventory_movements (inventory_id, kind, quantity, balance_after, reason)
        SELECT id, 'saldo_inicial', total_quantity, total_quantity, 'Unidades al activar el registro'
        FROM inventory WHERE total_quantity > 0
        """
    )


def downgrade() -> None:
    op.drop_table("inventory_movements")
