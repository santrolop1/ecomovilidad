"""Rol administrativo (users.is_admin) e imagen de producto opcional.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-06
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), server_default="false", nullable=False))
    op.alter_column("products", "image_url", existing_type=sa.String(length=500), nullable=True)


def downgrade() -> None:
    op.execute("UPDATE products SET image_url = '' WHERE image_url IS NULL")
    op.alter_column("products", "image_url", existing_type=sa.String(length=500), nullable=False)
    op.drop_column("users", "is_admin")
