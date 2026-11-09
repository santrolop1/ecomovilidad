from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field, field_validator

from app.core.api_model import ApiModel
from app.modules.autenticacion.schemas import PHONE_PATTERN

ContactStatus = Literal["nuevo", "atendido"]


class ContactMessageIn(ApiModel):
    full_name: str = Field(min_length=3, max_length=160)
    email: EmailStr = Field(max_length=254)
    phone: str | None = Field(default=None, pattern=PHONE_PATTERN)
    topic: Literal["compra", "alquiler", "domicilio", "mantenimiento", "otro"]
    message: str = Field(min_length=10, max_length=2000)
    data_consent: Literal[True]

    @field_validator("full_name", "message")
    @classmethod
    def strip(cls, value: str) -> str:
        return value.strip()


class ContactAck(ApiModel):
    id: uuid.UUID


class ContactMessageOut(ApiModel):
    id: uuid.UUID
    full_name: str
    email: str
    phone: str | None
    topic: str
    message: str
    status: ContactStatus
    created_at: datetime


class ContactStatusIn(ApiModel):
    status: ContactStatus
