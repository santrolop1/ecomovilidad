import uuid
from datetime import datetime

from app.core.api_model import ApiModel


class GeoPointOut(ApiModel):
    lat: float
    lng: float


class OpeningHoursOut(ApiModel):
    days: str
    opens: str
    closes: str


class CategoryAvailabilityOut(ApiModel):
    category: str
    available: int


class BranchOut(ApiModel):
    id: uuid.UUID
    slug: str
    name: str
    city: str
    neighborhood: str
    address: str
    location: GeoPointOut
    phone: str
    hours: list[OpeningHoursOut]
    services: list[str]
    inventory: list[CategoryAvailabilityOut]
    inventory_updated_at: datetime | None = None
    is_demo: bool
