"""Catálogo: serialización, filtros, ordenamiento y facetas (RF 6.1).

Las reglas replican src/features/catalog/lib/filter-products.ts del frontend
para que el modo mock y el modo real se comporten igual. El filtrado se hace
sobre los productos activos en memoria: adecuado para un catálogo de cientos
de productos; si crece a miles, mover los filtros a SQL.
"""

import unicodedata
from collections import Counter
from dataclasses import dataclass, field

from app.models import Product
from app.schemas.catalog import (
    BranchStockOut,
    FacetOption,
    Facets,
    ImageOut,
    PriceRange,
    ProductListOut,
    ProductOut,
    SpecFacet,
    SpecOut,
    StockOut,
    StockStatus,
)

LOW_STOCK_THRESHOLD = 5
CATEGORY_SLUGS = ("bicicletas", "patinetas", "patines", "drones")
SORTS = ("relevancia", "precio-asc", "precio-desc", "nombre", "nuevos")
MAX_QUERY_LENGTH = 80


@dataclass
class ProductFilters:
    query: str | None = None
    category: str | None = None
    brands: list[str] = field(default_factory=list)
    min_price: int | None = None
    max_price: int | None = None
    specs: dict[str, list[str]] = field(default_factory=dict)
    sort: str = "relevancia"


def available_units(product: Product) -> int:
    return sum(entry.available_quantity for entry in product.inventory)


def stock_status(available: int) -> StockStatus:
    if available == 0:
        return "out_of_stock"
    return "low_stock" if available <= LOW_STOCK_THRESHOLD else "in_stock"


def to_product_out(product: Product) -> ProductOut:
    available = available_units(product)
    return ProductOut(
        id=product.id,
        slug=product.slug,
        sku=product.sku,
        name=product.name,
        brand=product.brand,
        category=product.category.slug,
        short_description=product.short_description,
        description=product.description,
        price=product.price,
        compare_at_price=product.compare_at_price,
        images=[ImageOut(src=product.image_url, alt=product.name)] if product.image_url else [],
        specs=[SpecOut.model_validate(spec) for spec in product.specifications],
        highlights=list(product.highlights),
        stock=StockOut(
            status=stock_status(available),
            available=available,
            by_branch=[
                BranchStockOut(branch_id=entry.branch_id, quantity=entry.available_quantity)
                for entry in product.inventory
                if entry.available_quantity > 0
            ],
        ),
        featured=product.is_featured,
        created_at=product.created_at,
    )


def _normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFD", text)
    return "".join(c for c in decomposed if unicodedata.category(c) != "Mn").lower().strip()


def _matches_query(product: Product, query: str) -> bool:
    haystack = _normalize(
        " ".join([product.name, product.brand, product.category.slug, product.short_description, *product.highlights])
    )
    return all(term in haystack for term in _normalize(query).split())


def _spec_value(product: Product, key: str) -> str | None:
    for spec in product.specifications:
        if spec.get("key") == key:
            return str(spec.get("value"))
    return None


def _apply(products: list[Product], f: ProductFilters, skip: frozenset[str] = frozenset()) -> list[Product]:
    result = []
    for p in products:
        if "query" not in skip and f.query and not _matches_query(p, f.query):
            continue
        if "category" not in skip and f.category and p.category.slug != f.category:
            continue
        if "brands" not in skip and f.brands and p.brand not in f.brands:
            continue
        if "price" not in skip and (
            (f.min_price is not None and p.price < f.min_price) or (f.max_price is not None and p.price > f.max_price)
        ):
            continue
        if "specs" not in skip and any(values and _spec_value(p, key) not in values for key, values in f.specs.items()):
            continue
        result.append(p)
    return result


def _sort(products: list[Product], sort: str) -> list[Product]:
    if sort == "precio-asc":
        return sorted(products, key=lambda p: p.price)
    if sort == "precio-desc":
        return sorted(products, key=lambda p: -p.price)
    if sort == "nombre":
        return sorted(products, key=lambda p: _normalize(p.name))
    if sort == "nuevos":
        return sorted(products, key=lambda p: p.created_at, reverse=True)
    # Relevancia: destacados primero, agotados al final.
    return sorted(products, key=lambda p: (not p.is_featured, available_units(p) == 0))


def _count(values: list[str]) -> list[FacetOption]:
    return [FacetOption(value=v, count=c) for v, c in sorted(Counter(values).items(), key=lambda kv: _normalize(kv[0]))]


def _facets(products: list[Product], f: ProductFilters) -> Facets:
    for_categories = _apply(products, f, frozenset({"category", "specs"}))
    for_brands = _apply(products, f, frozenset({"brands"}))
    spec_labels: dict[str, str] = {}
    spec_values: dict[str, list[str]] = {}
    if f.category:  # las especificaciones solo tienen sentido dentro de una categoría
        for p in _apply(products, f, frozenset({"specs"})):
            for spec in p.specifications:
                if spec.get("facet"):
                    spec_labels.setdefault(spec["key"], spec["label"])
                    spec_values.setdefault(spec["key"], []).append(str(spec["value"]))
    scope = [p for p in products if not f.category or p.category.slug == f.category]
    prices = [p.price for p in scope]
    return Facets(
        categories=_count([p.category.slug for p in for_categories]),
        brands=_count([p.brand for p in for_brands]),
        specs=[SpecFacet(key=k, label=spec_labels[k], options=_count(v)) for k, v in spec_values.items()],
        price_range=PriceRange(min=min(prices, default=0), max=max(prices, default=0)),
    )


def query_products(products: list[Product], f: ProductFilters) -> ProductListOut:
    items = _sort(_apply(products, f), f.sort)
    return ProductListOut(items=[to_product_out(p) for p in items], total=len(items), facets=_facets(products, f))


def parse_filters(params: dict[str, list[str]]) -> ProductFilters:
    """Interpreta los mismos parámetros de URL que usa el frontend. Los
    valores inválidos se ignoran en lugar de devolver error."""

    def first(name: str) -> str | None:
        values = params.get(name)
        return values[0] if values else None

    def as_list(name: str) -> list[str]:
        return [v.strip() for raw in params.get(name, []) for v in raw.split(",") if v.strip()]

    def as_price(name: str) -> int | None:
        raw = first(name)
        return int(raw) if raw and raw.isdigit() and len(raw) <= 10 else None

    query = (first("q") or "").strip()[:MAX_QUERY_LENGTH] or None
    category = first("categoria")
    sort = first("orden")
    specs = {name.removeprefix("spec_"): as_list(name) for name in params if name.startswith("spec_") and as_list(name)}
    return ProductFilters(
        query=query,
        category=category if category in CATEGORY_SLUGS else None,
        brands=as_list("marca"),
        min_price=as_price("precioMin"),
        max_price=as_price("precioMax"),
        specs=specs,
        sort=sort if sort in SORTS else "relevancia",
    )
