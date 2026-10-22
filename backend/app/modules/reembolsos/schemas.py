import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator

from app.core.api_model import ApiModel


class RefundRequestIn(ApiModel):
    reason: str = Field(min_length=10, max_length=500)

    @field_validator("reason")
    @classmethod
    def strip(cls, value: str) -> str:
        return value.strip()


class RefundRequestOut(ApiModel):
    status: Literal["abierta", "reembolsada"]
    reason: str
    created_at: datetime
    resolved_at: datetime | None = None


class AdminRefundRequestOut(RefundRequestOut):
    order_id: uuid.UUID | None = None
    rental_id: uuid.UUID | None = None
    user_email: str
    amount: int
