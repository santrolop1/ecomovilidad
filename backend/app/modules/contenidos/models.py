from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPrimaryKey

VALUE_PROP_ICONS = ("truck", "shield", "leaf", "wrench", "map-pin", "credit-card")


class ValueProposition(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "value_propositions"

    title: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(String(240))
    icon: Mapped[str] = mapped_column(String(20))
    position: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


class Banner(UUIDPrimaryKey, Timestamps, Base):
    """Banner con vigencia: la tienda solo muestra los que están dentro de sus fechas."""

    __tablename__ = "banners"
    __table_args__ = (CheckConstraint("ends_at > starts_at", name="valid_window"),)

    title: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(String(240))
    cta_label: Mapped[str] = mapped_column(String(40))
    cta_href: Mapped[str] = mapped_column(String(200))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


class NewsItem(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "news_items"

    slug: Mapped[str] = mapped_column(String(80), unique=True)
    title: Mapped[str] = mapped_column(String(120))
    excerpt: Mapped[str] = mapped_column(String(300))
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
