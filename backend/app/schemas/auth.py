import re
import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, ConfigDict, EmailStr, Field, field_validator

from .base import ApiModel

PASSWORD_MIN_LENGTH = 10
PHONE_PATTERN = r"^\+?[\d\s()-]{7,20}$"


def _strong(value: str) -> str:
    if not re.search(r"[A-Za-zÁÉÍÓÚáéíóúÑñ]", value) or not re.search(r"\d", value):
        raise ValueError("La contraseña debe incluir letras y números.")
    return value


# Misma política en registro, cambio y recuperación de contraseña.
Password = Annotated[str, Field(min_length=PASSWORD_MIN_LENGTH, max_length=128), AfterValidator(_strong)]


class RegisterIn(ApiModel):
    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=2, max_length=80)
    email: EmailStr = Field(max_length=254)
    phone: str = Field(pattern=PHONE_PATTERN)
    password: Password
    # Autorización de tratamiento de datos (Ley 1581): obligatoria y con evidencia.
    data_consent: Literal[True]
    policy_version: str | None = Field(default=None, max_length=20)

    @field_validator("first_name", "last_name", "phone")
    @classmethod
    def strip(cls, value: str) -> str:
        return value.strip()

    @field_validator("email")
    @classmethod
    def lower(cls, value: str) -> str:
        return value.lower()


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


class ProfileUpdateIn(ApiModel):
    """Solo datos personales editables. Cualquier otro campo (is_admin, email,
    password_hash…) se rechaza con 422."""

    model_config = ConfigDict(**ApiModel.model_config, extra="forbid")

    first_name: str | None = Field(default=None, min_length=2, max_length=80)
    last_name: str | None = Field(default=None, min_length=2, max_length=80)
    phone: str | None = Field(default=None, pattern=PHONE_PATTERN)
    document_number: str | None = Field(default=None, pattern=r"^(?:[A-Za-z0-9-]{5,20})?$")

    @field_validator("first_name", "last_name", "phone", "document_number")
    @classmethod
    def strip(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class PasswordChangeIn(ApiModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: Password


class PasswordResetRequestIn(ApiModel):
    email: EmailStr


class PasswordResetConfirmIn(ApiModel):
    token: str = Field(min_length=20, max_length=200)
    new_password: Password


class ConsentOut(ApiModel):
    purpose: str
    policy_version: str
    order_id: uuid.UUID | None = None
    accepted_at: datetime
