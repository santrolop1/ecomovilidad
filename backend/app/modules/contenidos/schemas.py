from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field, model_validator

from app.core.api_model import ApiModel

SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
# Solo rutas internas: un administrador no puede enlazar a otro sitio ni a javascript:.
INTERNAL_PATH = r"^/([A-Za-z0-9\-._~?=&%#][A-Za-z0-9\-._~/?=&%#]*)?$"
Icon = Literal["truck", "shield", "leaf", "wrench", "map-pin", "credit-card"]


class ValuePropositionOut(ApiModel):
    id: uuid.UUID
    title: str
    description: str
    icon: Icon


class CtaOut(ApiModel):
    label: str
    href: str


class BannerOut(ApiModel):
    id: uuid.UUID
    title: str
    description: str
    cta: CtaOut
    starts_at: datetime
    ends_at: datetime


class NewsItemOut(ApiModel):
    id: uuid.UUID
    slug: str
    title: str
    excerpt: str
    published_at: datetime


class HomeContentOut(ApiModel):
    value_propositions: list[ValuePropositionOut]
    banners: list[BannerOut]


class AdminValuePropositionOut(ValuePropositionOut):
    position: int
    is_active: bool


class AdminBannerOut(BannerOut):
    is_active: bool


class AdminNewsItemOut(NewsItemOut):
    is_published: bool


class AdminContentOut(ApiModel):
    value_propositions: list[AdminValuePropositionOut]
    banners: list[AdminBannerOut]
    news: list[AdminNewsItemOut]


class ValuePropositionIn(ApiModel):
    title: str = Field(min_length=3, max_length=80)
    description: str = Field(min_length=3, max_length=240)
    icon: Icon
    position: int = Field(default=0, ge=0, le=100)
    is_active: bool = True


class BannerIn(ApiModel):
    title: str = Field(min_length=3, max_length=80)
    description: str = Field(min_length=3, max_length=240)
    cta_label: str = Field(min_length=2, max_length=40)
    cta_href: str = Field(pattern=INTERNAL_PATH, max_length=200)
    starts_at: datetime
    ends_at: datetime
    is_active: bool = True

    @model_validator(mode="after")
    def window_is_valid(self) -> BannerIn:
        if self.ends_at <= self.starts_at:
            raise ValueError("El banner debe terminar después de empezar.")
        return self


class NewsItemIn(ApiModel):
    slug: str = Field(pattern=SLUG_PATTERN, max_length=80)
    title: str = Field(min_length=3, max_length=120)
    excerpt: str = Field(min_length=3, max_length=300)
    published_at: datetime
    is_published: bool = True
