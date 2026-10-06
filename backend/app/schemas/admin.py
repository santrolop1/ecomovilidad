"""Esquemas del panel administrativo (/api/v1/admin)."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import Field, field_validator, model_validator

from app.models.enums import BranchService, FulfillmentMethod, OrderStatus, PaymentMethod, RentalStatus

from .base import ApiModel

SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
IMAGE_PATTERN = r"^/images/[A-Za-z0-9/_.-]+\.(?:webp|jpg|jpeg|png)$"
TIME_PATTERN = r"^(?:[01]\d|2[0-3]):[0-5]\d$"
# Margen alrededor del área metropolitana de Bucaramanga.
METRO_LAT = (6.85, 7.25)
METRO_LNG = (-73.30, -72.95)

# Debe coincidir con SERVICE_AREA_CITIES (lo verifica tests/test_admin.py).
ServiceAreaCity = Literal["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta"]


class Page[T](ApiModel):
    items: list[T]
    total: int
    page: int
    page_size: int


# ─── Catálogo ──────────────────────────────────────────────────────────────


class SpecIn(ApiModel):
    key: str = Field(pattern=r"^[a-z0-9_]{1,40}$")
    label: str = Field(min_length=1, max_length=60)
    value: str | int | float
    unit: str | None = Field(default=None, max_length=20)
    facet: bool = False


class CategoryRef(ApiModel):
    id: uuid.UUID
    slug: str
    name: str


class AdminProductOut(ApiModel):
    id: uuid.UUID
    slug: str
    sku: str
    name: str
    brand: str
    category: CategoryRef
    short_description: str
    description: str
    price: int
    compare_at_price: int | None
    specifications: list[SpecIn]
    highlights: list[str]
    image_url: str | None
    is_featured: bool
    is_active: bool
    available: int
    reserved: int
    total: int
    created_at: datetime
    updated_at: datetime


class InventoryRowOut(ApiModel):
    id: uuid.UUID | None
    product_id: uuid.UUID
    product_name: str
    product_slug: str
    sku: str
    branch_id: uuid.UUID
    branch_name: str
    city: str
    available: int
    reserved: int
    total: int
    sold: int
    updated_at: datetime | None


class AdminProductDetailOut(AdminProductOut):
    inventory: list[InventoryRowOut]


class _ProductFields(ApiModel):
    @field_validator("highlights", check_fields=False)
    @classmethod
    def clean_highlights(cls, value: list[str] | None) -> list[str] | None:
        return None if value is None else [h.strip() for h in value if h.strip()]


class ProductCreateIn(_ProductFields):
    category_id: uuid.UUID
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(pattern=SLUG_PATTERN, max_length=140)
    sku: str = Field(pattern=r"^[A-Z0-9-]{3,40}$")
    brand: str = Field(min_length=1, max_length=80)
    short_description: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    price: int = Field(ge=0, le=1_000_000_000)
    compare_at_price: int | None = Field(default=None, ge=0, le=1_000_000_000)
    specifications: list[SpecIn] = Field(default_factory=list, max_length=20)
    highlights: list[str] = Field(default_factory=list, max_length=8)
    image_url: str | None = Field(default=None, pattern=IMAGE_PATTERN, max_length=500)
    is_featured: bool = False
    is_active: bool = True

    @model_validator(mode="after")
    def check_prices(self) -> ProductCreateIn:
        if self.compare_at_price is not None and self.compare_at_price <= self.price:
            raise ValueError("El precio anterior debe ser mayor que el precio actual.")
        return self


class ProductUpdateIn(_ProductFields):
    """Actualización parcial: solo se aplican los campos enviados."""

    category_id: uuid.UUID | None = None
    name: str | None = Field(default=None, min_length=2, max_length=120)
    slug: str | None = Field(default=None, pattern=SLUG_PATTERN, max_length=140)
    sku: str | None = Field(default=None, pattern=r"^[A-Z0-9-]{3,40}$")
    brand: str | None = Field(default=None, min_length=1, max_length=80)
    short_description: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=5000)
    price: int | None = Field(default=None, ge=0, le=1_000_000_000)
    compare_at_price: int | None = Field(default=None, ge=0, le=1_000_000_000)
    specifications: list[SpecIn] | None = Field(default=None, max_length=20)
    highlights: list[str] | None = Field(default=None, max_length=8)
    image_url: str | None = Field(default=None, pattern=IMAGE_PATTERN, max_length=500)
    is_featured: bool | None = None
    is_active: bool | None = None


class InventoryUpsertIn(ApiModel):
    total_quantity: int = Field(ge=0, le=100_000)


class AdminCategoryOut(ApiModel):
    id: uuid.UUID
    slug: str
    name: str
    description: str
    product_count: int


class CategoryIn(ApiModel):
    name: str = Field(min_length=2, max_length=60)
    slug: str = Field(pattern=SLUG_PATTERN, max_length=60)
    description: str = Field(default="", max_length=500)


class CategoryUpdateIn(ApiModel):
    name: str | None = Field(default=None, min_length=2, max_length=60)
    slug: str | None = Field(default=None, pattern=SLUG_PATTERN, max_length=60)
    description: str | None = Field(default=None, max_length=500)


# ─── Sucursales ────────────────────────────────────────────────────────────


class OpeningHoursIn(ApiModel):
    days: str = Field(min_length=3, max_length=40)
    opens: str = Field(pattern=TIME_PATTERN)
    closes: str = Field(pattern=TIME_PATTERN)

    @model_validator(mode="after")
    def check_order(self) -> OpeningHoursIn:
        if self.closes <= self.opens:
            raise ValueError("La hora de cierre debe ser posterior a la de apertura.")
        return self


class AdminBranchOut(ApiModel):
    id: uuid.UUID
    slug: str
    name: str
    address: str
    neighborhood: str
    city: str
    phone: str
    latitude: float
    longitude: float
    opening_hours: list[OpeningHoursIn]
    services: list[BranchService]
    is_demo: bool
    is_active: bool
    available: int
    reserved: int
    total: int
    updated_at: datetime


class AdminBranchDetailOut(AdminBranchOut):
    inventory: list[InventoryRowOut]


class _BranchCoordinates(ApiModel):
    @field_validator("latitude", check_fields=False)
    @classmethod
    def lat_in_metro(cls, value: float | None) -> float | None:
        if value is not None and not METRO_LAT[0] <= value <= METRO_LAT[1]:
            raise ValueError("La latitud está fuera del área metropolitana de Bucaramanga.")
        return value

    @field_validator("longitude", check_fields=False)
    @classmethod
    def lng_in_metro(cls, value: float | None) -> float | None:
        if value is not None and not METRO_LNG[0] <= value <= METRO_LNG[1]:
            raise ValueError("La longitud está fuera del área metropolitana de Bucaramanga.")
        return value


class BranchCreateIn(_BranchCoordinates):
    slug: str = Field(pattern=SLUG_PATTERN, max_length=80)
    name: str = Field(min_length=2, max_length=80)
    address: str = Field(min_length=5, max_length=160)
    neighborhood: str = Field(min_length=2, max_length=80)
    city: ServiceAreaCity
    phone: str = Field(pattern=r"^\+?[\d\s()-]{7,20}$")
    latitude: float
    longitude: float
    opening_hours: list[OpeningHoursIn] = Field(default_factory=list, max_length=7)
    services: list[BranchService] = Field(default_factory=list)
    is_demo: bool = False
    is_active: bool = True


class BranchUpdateIn(_BranchCoordinates):
    slug: str | None = Field(default=None, pattern=SLUG_PATTERN, max_length=80)
    name: str | None = Field(default=None, min_length=2, max_length=80)
    address: str | None = Field(default=None, min_length=5, max_length=160)
    neighborhood: str | None = Field(default=None, min_length=2, max_length=80)
    city: ServiceAreaCity | None = None
    phone: str | None = Field(default=None, pattern=r"^\+?[\d\s()-]{7,20}$")
    latitude: float | None = None
    longitude: float | None = None
    opening_hours: list[OpeningHoursIn] | None = Field(default=None, max_length=7)
    services: list[BranchService] | None = None
    is_demo: bool | None = None
    is_active: bool | None = None


# ─── Pedidos, usuarios, alquileres ─────────────────────────────────────────


class AdminOrderSummaryOut(ApiModel):
    id: uuid.UUID
    status: OrderStatus
    total: int
    item_count: int
    contact_name: str
    user_email: str
    fulfillment_method: FulfillmentMethod
    branch_name: str
    scheduled_date: date
    created_at: datetime


class OrderUserOut(ApiModel):
    id: uuid.UUID
    email: str
    first_name: str
    last_name: str


class AdminOrderItemOut(ApiModel):
    product_id: uuid.UUID
    name: str
    sku: str
    quantity: int
    unit_price: int
    subtotal: int


class AdminOrderDetailOut(AdminOrderSummaryOut):
    subtotal: int
    shipping_cost: int
    payment_method: PaymentMethod
    delivery_address: str | None
    delivery_city: str | None
    time_slot: str
    contact_email: str
    contact_phone: str
    document_type: str
    document_number: str
    branch_id: uuid.UUID
    branch_city: str
    user: OrderUserOut
    items: list[AdminOrderItemOut]
    updated_at: datetime
    allowed_transitions: list[OrderStatus]


class OrderStatusIn(ApiModel):
    status: OrderStatus


class AdminUserOut(ApiModel):
    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    phone: str
    document_number: str | None
    is_active: bool
    is_admin: bool
    order_count: int
    created_at: datetime


class AdminUserDetailOut(AdminUserOut):
    recent_orders: list[AdminOrderSummaryOut]


class UserUpdateIn(ApiModel):
    is_active: bool


class AdminRentalOut(ApiModel):
    id: uuid.UUID
    status: RentalStatus
    user_email: str
    user_name: str
    product_name: str
    branch_name: str
    start_at: datetime
    end_at: datetime
    price: int
    created_at: datetime


# ─── Dashboard ─────────────────────────────────────────────────────────────


class LowStockOut(ApiModel):
    product_id: uuid.UUID
    name: str
    sku: str
    available: int
    reserved: int


class DashboardOut(ApiModel):
    products_total: int
    products_active: int
    products_featured: int
    products_without_image: int
    categories: int
    branches_total: int
    branches_active: int
    branches_demo: int
    users_total: int
    users_active: int
    admins: int
    orders_total: int
    orders_by_status: dict[OrderStatus, int]
    revenue_confirmed: int
    units_available: int
    units_reserved: int
    units_total: int
    rentals_total: int
    rentals_by_status: dict[RentalStatus, int]
    low_stock_threshold: int
    low_stock: list[LowStockOut]
    recent_orders: list[AdminOrderSummaryOut]
