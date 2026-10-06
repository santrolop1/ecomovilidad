import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field, field_validator

from .base import ApiModel

PASSWORD_MIN_LENGTH = 10
PHONE_PATTERN = r"^\+?[\d\s()-]{7,20}$"


class RegisterIn(ApiModel):
    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=2, max_length=80)
    email: EmailStr = Field(max_length=254)
    phone: str = Field(pattern=PHONE_PATTERN)
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=128)
    # Autorización de tratamiento de datos (Ley 1581): obligatoria.
    data_consent: Literal[True]

    @field_validator("first_name", "last_name", "phone")
    @classmethod
    def strip(cls, value: str) -> str:
        return value.strip()

    @field_validator("email")
    @classmethod
    def lower(cls, value: str) -> str:
        return value.lower()

    @field_validator("password")
    @classmethod
    def strong(cls, value: str) -> str:
        if not re.search(r"[A-Za-zÁÉÍÓÚáéíóúÑñ]", value) or not re.search(r"\d", value):
            raise ValueError("La contraseña debe incluir letras y números.")
        return value


class LoginIn(ApiModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def lower(cls, value: str) -> str:
        return value.lower()


class UserOut(ApiModel):
    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    phone: str
    document_number: str | None = None
    is_admin: bool
    created_at: datetime


class SessionOut(ApiModel):
    user: UserOut
    expires_at: datetime
