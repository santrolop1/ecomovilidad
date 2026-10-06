from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy import select

from app.api.client_ip import client_ip
from app.api.deps import CurrentSession, CurrentUser, DbSession
from app.core.config import get_settings
from app.core.email import EmailSender, get_email_sender
from app.core.security import CSRF_COOKIE, SESSION_COOKIE
from app.models import ConsentRecord
from app.schemas.auth import (
    ConsentOut,
    LoginIn,
    PasswordChangeIn,
    PasswordResetConfirmIn,
    PasswordResetRequestIn,
    ProfileUpdateIn,
    RegisterIn,
    SessionOut,
    UserOut,
)
from app.services import auth as service

router = APIRouter(prefix="/auth", tags=["autenticación"])

RESET_REQUESTED = "Si el correo está registrado, te enviamos un enlace para restablecer la contraseña."


def _set_session_cookies(response: Response, issued: service.IssuedSession) -> None:
    settings = get_settings()
    max_age = settings.session_ttl_hours * 3600
    common = {"max_age": max_age, "secure": settings.cookie_secure, "samesite": "lax", "path": "/"}
    # Sesión: httpOnly, inaccesible para JavaScript.
    response.set_cookie(SESSION_COOKIE, issued.token, httponly=True, **common)
    # CSRF: legible para enviarlo en la cabecera X-CSRF-Token.
    response.set_cookie(CSRF_COOKIE, issued.csrf_token, httponly=False, **common)


def _session_out(issued: service.IssuedSession) -> SessionOut:
    return SessionOut(user=UserOut.model_validate(issued.user), expires_at=issued.expires_at)


@router.post(
    "/register", response_model=SessionOut, status_code=status.HTTP_201_CREATED, response_model_exclude_none=True
)
def register(data: RegisterIn, response: Response, db: DbSession):
    issued = service.register(db, data)
    _set_session_cookies(response, issued)
    return _session_out(issued)


@router.post("/login", response_model=SessionOut, response_model_exclude_none=True)
def login(data: LoginIn, request: Request, response: Response, db: DbSession):
    issued = service.login(db, data, client_ip(request))
    _set_session_cookies(response, issued)
    return _session_out(issued)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(session: CurrentSession, response: Response, db: DbSession) -> None:
    service.logout(db, session)
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie(CSRF_COOKIE, path="/")


@router.get("/me", response_model=UserOut, response_model_exclude_none=True)
def me(user: CurrentUser):
    return user


@router.patch("/me", response_model=UserOut, response_model_exclude_none=True)
def update_me(data: ProfileUpdateIn, user: CurrentUser, db: DbSession):
    return service.update_profile(db, user, data)


@router.get("/me/consents", response_model=list[ConsentOut], response_model_exclude_none=True)
def my_consents(user: CurrentUser, db: DbSession):
    """Evidencia de las autorizaciones de tratamiento de datos del usuario."""
    return list(
        db.scalars(
            select(ConsentRecord).where(ConsentRecord.user_id == user.id).order_by(ConsentRecord.accepted_at.desc())
        )
    )


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(data: PasswordChangeIn, request: Request, session: CurrentSession, db: DbSession) -> None:
    service.change_password(db, session, data, client_ip(request))


@router.post("/password-reset/request", status_code=status.HTTP_202_ACCEPTED)
def request_password_reset(
    data: PasswordResetRequestIn, db: DbSession, sender: Annotated[EmailSender, Depends(get_email_sender)]
) -> dict[str, str]:
    service.request_password_reset(db, data.email, sender)
    return {"detail": RESET_REQUESTED}


@router.post("/password-reset/confirm", status_code=status.HTTP_204_NO_CONTENT)
def confirm_password_reset(data: PasswordResetConfirmIn, db: DbSession) -> None:
    service.confirm_password_reset(db, data)
