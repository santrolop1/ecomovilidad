"""Contenidos de la tienda (CU-09). La tienda lee; el panel crea, edita y borra."""

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models import Banner, NewsItem, ValueProposition
from app.modules.contenidos.schemas import (
    AdminBannerOut,
    AdminContentOut,
    AdminNewsItemOut,
    AdminValuePropositionOut,
    BannerIn,
    BannerOut,
    CtaOut,
    HomeContentOut,
    NewsItemIn,
    NewsItemOut,
    ValuePropositionIn,
    ValuePropositionOut,
)
from app.modules.inventario.reservations import now_utc

MODELS = {"value-propositions": ValueProposition, "banners": Banner, "news": NewsItem}


def _banner_fields(banner: Banner) -> dict:
    return {
        "id": banner.id,
        "title": banner.title,
        "description": banner.description,
        "cta": CtaOut(label=banner.cta_label, href=banner.cta_href),
        "starts_at": banner.starts_at,
        "ends_at": banner.ends_at,
    }


def home_content(db: Session) -> HomeContentOut:
    now = now_utc()
    props = db.scalars(
        select(ValueProposition)
        .where(ValueProposition.is_active)
        .order_by(ValueProposition.position, ValueProposition.title)
    )
    banners = db.scalars(
        select(Banner)
        .where(Banner.is_active, Banner.starts_at <= now, Banner.ends_at >= now)
        .order_by(Banner.starts_at.desc())
    )
    return HomeContentOut(
        value_propositions=[
            ValuePropositionOut(id=p.id, title=p.title, description=p.description, icon=p.icon) for p in props
        ],
        banners=[BannerOut(**_banner_fields(b)) for b in banners],
    )


def list_news(db: Session) -> list[NewsItemOut]:
    items = db.scalars(
        select(NewsItem)
        .where(NewsItem.is_published, NewsItem.published_at <= now_utc())
        .order_by(NewsItem.published_at.desc())
    )
    return [
        NewsItemOut(id=n.id, slug=n.slug, title=n.title, excerpt=n.excerpt, published_at=n.published_at) for n in items
    ]


def admin_content(db: Session) -> AdminContentOut:
    props = db.scalars(select(ValueProposition).order_by(ValueProposition.position, ValueProposition.title))
    banners = db.scalars(select(Banner).order_by(Banner.starts_at.desc()))
    news = db.scalars(select(NewsItem).order_by(NewsItem.published_at.desc()))
    return AdminContentOut(
        value_propositions=[
            AdminValuePropositionOut(
                id=p.id,
                title=p.title,
                description=p.description,
                icon=p.icon,
                position=p.position,
                is_active=p.is_active,
            )
            for p in props
        ],
        banners=[AdminBannerOut(**_banner_fields(b), is_active=b.is_active) for b in banners],
        news=[
            AdminNewsItemOut(
                id=n.id,
                slug=n.slug,
                title=n.title,
                excerpt=n.excerpt,
                published_at=n.published_at,
                is_published=n.is_published,
            )
            for n in news
        ],
    )


def _commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ConflictError("Ya existe una noticia con ese slug.") from error


def save(
    db: Session, kind: str, data: ValuePropositionIn | BannerIn | NewsItemIn, item_id: uuid.UUID | None = None
) -> AdminContentOut:
    model = MODELS[kind]
    if item_id is None:
        db.add(model(**data.model_dump()))
    else:
        item = db.get(model, item_id)
        if item is None:
            raise NotFoundError("Ese contenido no existe.")
        for field, value in data.model_dump().items():
            setattr(item, field, value)
    _commit(db)
    return admin_content(db)


def delete(db: Session, kind: str, item_id: uuid.UUID) -> AdminContentOut:
    item = db.get(MODELS[kind], item_id)
    if item is None:
        raise NotFoundError("Ese contenido no existe.")
    db.delete(item)
    db.commit()
    return admin_content(db)
