from fastapi import APIRouter, Response, status

from app.api.deps import CurrentSession, CurrentUser, DbSession
from app.core.config import get_settings
from app.core.security import CSRF_COOKIE, SESSION_COOKIE
from app.schemas.auth import LoginIn, RegisterIn, SessionOut, UserOut
from app.services import auth as service

router = APIRouter(prefix="/auth", tags=["autenticación"])


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
def login(data: LoginIn, response: Response, db: DbSession):
    issued = service.login(db, data)
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
