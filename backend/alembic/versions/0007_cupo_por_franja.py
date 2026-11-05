"""Cupo por franja horaria en cada sucursal (CU-06).

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-05 12:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("branches", sa.Column("slot_capacity", sa.Integer(), server_default="6", nullable=False))
    op.create_check_constraint(op.f("ck_branches_slot_capacity_positive"), "branches", "slot_capacity > 0")


def downgrade() -> None:
    op.drop_constraint(op.f("ck_branches_slot_capacity_positive"), "branches", type_="check")
    op.drop_column("branches", "slot_capacity")
