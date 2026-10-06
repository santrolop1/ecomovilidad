import uuid
from datetime import datetime

from app.models.enums import RentalStatus

from .base import ApiModel


class RentalOut(ApiModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    branch_id: uuid.UUID
    branch_name: str
    start_at: datetime
    end_at: datetime
    status: RentalStatus
    price: int
