from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import BigInteger, Boolean, CheckConstraint, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.modules.inventario.models import Inventory


class Category(UUIDPrimaryKey, Base):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(60), unique=True)
    slug: Mapped[str] = mapped_column(String(60), unique=True)
    description: Mapped[str] = mapped_column(Text, default="", server_default="")

    products: Mapped[list[Product]] = relationship(back_populates="category")


class Product(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price >= 0", name="price_non_negative"),
        CheckConstraint("compare_at_price IS NULL OR compare_at_price > price", name="compare_at_above_price"),
        CheckConstraint("jsonb_typeof(specifications) = 'array'", name="specifications_is_array"),
    )

    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(140), unique=True)
    # Columnas que la UI existente muestra (referencia, resumen, precio anterior, destacados).
    sku: Mapped[str] = mapped_column(String(40), unique=True)
    short_description: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    brand: Mapped[str] = mapped_column(String(80), index=True)
    # Pesos colombianos, IVA incluido. Sin decimales.
    price: Mapped[int] = mapped_column(BigInteger)
    compare_at_price: Mapped[int | None] = mapped_column(BigInteger)
    # [{"key", "label", "value", "unit"?, "facet"?}]
    specifications: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, server_default="[]")
    highlights: Mapped[list[str]] = mapped_column(ARRAY(String(80)), default=list, server_default="{}")
    # Ruta de la foto en el frontend (/images/products/...). NULL = "Imagen pendiente".
    image_url: Mapped[str | None] = mapped_column(String(500))
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", index=True)

    category: Mapped[Category] = relationship(back_populates="products", lazy="joined")
    inventory: Mapped[list[Inventory]] = relationship(back_populates="product")
