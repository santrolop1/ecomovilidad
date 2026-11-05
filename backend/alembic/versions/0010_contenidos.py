"""Contenidos editables: propuesta de valor, banners y noticias (CU-09).

Los textos iniciales entran aquí y no en el seed: el seed corre en cada arranque
y devolvería lo que un administrador haya borrado.

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-05 15:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _base_columns() -> list[sa.Column]:
    return [
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    ]


def upgrade() -> None:
    value_propositions = op.create_table(
        "value_propositions",
        sa.Column("title", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=240), nullable=False),
        sa.Column("icon", sa.String(length=20), nullable=False),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        *_base_columns(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_value_propositions")),
    )
    banners = op.create_table(
        "banners",
        sa.Column("title", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=240), nullable=False),
        sa.Column("cta_label", sa.String(length=40), nullable=False),
        sa.Column("cta_href", sa.String(length=200), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        *_base_columns(),
        sa.CheckConstraint("ends_at > starts_at", name=op.f("ck_banners_valid_window")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_banners")),
    )
    news = op.create_table(
        "news_items",
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("excerpt", sa.String(length=300), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_published", sa.Boolean(), server_default="true", nullable=False),
        *_base_columns(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_news_items")),
        sa.UniqueConstraint("slug", name=op.f("uq_news_items_slug")),
    )
    op.bulk_insert(
        value_propositions,
        [
            {
                "title": "Entrega con seguimiento",
                "description": "Recibes un enlace para ver el avance del domicilio y confirmas la entrega con un código QR.",
                "icon": "truck",
                "position": 1,
            },
            {
                "title": "Flota siempre revisada",
                "description": "Los equipos de alquiler salen de la oferta antes de llegar a su límite de mantenimiento.",
                "icon": "wrench",
                "position": 2,
            },
            {
                "title": "Paga como prefieras",
                "description": "PSE, tarjetas de crédito y débito o billeteras digitales, con factura de venta.",
                "icon": "credit-card",
                "position": 3,
            },
            {
                "title": "Tus datos protegidos",
                "description": "Tratamos tu información conforme a la Ley 1581 de 2012 y solo con tu autorización.",
                "icon": "shield",
                "position": 4,
            },
        ],
    )
    op.execute(
        sa.insert(banners).values(
            title="Temporada de ciclovía",
            description="Bicicletas eléctricas urbanas para moverte por el área metropolitana. Dato de demostración.",
            cta_label="Ver bicicletas",
            cta_href="/catalogo?categoria=bicicletas",
            starts_at=sa.text("now()"),
            ends_at=sa.text("now() + interval '6 months'"),
        )
    )
    op.execute(
        sa.insert(news).values(
            [
                {
                    "slug": "nuevo-punto-piedecuesta",
                    "title": "Abrimos punto de servicio en Piedecuesta",
                    "excerpt": "Ya ofrecemos venta, alquiler y taller de mantenimiento en Piedecuesta. Dato de demostración.",
                    "published_at": sa.text("TIMESTAMPTZ '2026-09-28 09:00:00-05'"),
                },
                {
                    "slug": "seguimiento-de-domicilios",
                    "title": "Ahora puedes seguir tu domicilio",
                    "excerpt": "Cada pedido a domicilio incluye un enlace para ver su avance. Dato de demostración.",
                    "published_at": sa.text("TIMESTAMPTZ '2026-09-15 09:00:00-05'"),
                },
                {
                    "slug": "drones-con-geocerca",
                    "title": "Drones de alquiler con zona delimitada",
                    "excerpt": "Los drones de la flota operan dentro de zonas delimitadas. Dato de demostración.",
                    "published_at": sa.text("TIMESTAMPTZ '2026-08-30 09:00:00-05'"),
                },
            ]
        )
    )


def downgrade() -> None:
    op.drop_table("news_items")
    op.drop_table("banners")
    op.drop_table("value_propositions")
