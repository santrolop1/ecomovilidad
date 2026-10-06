import uuid
from datetime import datetime
from typing import Literal

from .base import ApiModel

StockStatus = Literal["in_stock", "low_stock", "out_of_stock"]


class ImageOut(ApiModel):
    src: str
    alt: str


class SpecOut(ApiModel):
    key: str
    label: str
    value: str | int | float
    unit: str | None = None
    facet: bool | None = None


class BranchStockOut(ApiModel):
    branch_id: uuid.UUID
    quantity: int


class StockOut(ApiModel):
    status: StockStatus
    available: int
    by_branch: list[BranchStockOut]


class ProductOut(ApiModel):
    id: uuid.UUID
    slug: str
    sku: str
    name: str
    brand: str
    category: str
    short_description: str
    description: str
    price: int
    compare_at_price: int | None = None
    images: list[ImageOut]
    specs: list[SpecOut]
    highlights: list[str]
    stock: StockOut
    featured: bool
    created_at: datetime


class FacetOption(ApiModel):
    value: str
    count: int


class SpecFacet(ApiModel):
    key: str
    label: str
    options: list[FacetOption]


class PriceRange(ApiModel):
    min: int
    max: int


class Facets(ApiModel):
    categories: list[FacetOption]
    brands: list[FacetOption]
    specs: list[SpecFacet]
    price_range: PriceRange


class ProductListOut(ApiModel):
    items: list[ProductOut]
    total: int
    facets: Facets


class CategoryOut(ApiModel):
    id: uuid.UUID
    slug: str
    name: str
    description: str


class InventoryOut(ApiModel):
    branch_id: uuid.UUID
    branch_slug: str
    branch_name: str
    city: str
    available_quantity: int
    reserved_quantity: int
    total_quantity: int
    updated_at: datetime
