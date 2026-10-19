from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import CSRF_HEADER, SESSION_COOKIE, tokens_match
from app.db.session import get_db
from app.models import User, UserSession
from app.services import auth as auth_service

DbSession = Annotated[Session, Depends(get_db)]


def release_expired_reservations(db: DbSession) -> None:
    """Antes de atender cualquier solicitud se libera lo vencido: reservas de
    carrito (RF 6.2) y pedidos o alquileres sin pagar a tiempo. Así nada vencido
    bloquea inventario ni unidades de alquiler. Sin Celery ni Redis."""
    from app.services.payments.service import expire_unpaid
    from app.services.reservations import release_expired

    release_expired(db)
    expire_unpaid(db)
    db.commit()


SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def get_current_session(
    request: Request,
    db: DbSession,
    em_session: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
    csrf_token: Annotated[str | None, Header(alias=CSRF_HEADER)] = None,
) -> UserSession:
    """Sesión válida desde la cookie httpOnly. En métodos que modifican datos
    exige además el token CSRF en cabecera (patrón synchronizer token)."""
    session = auth_service.resolve_session(db, em_session)
    if session is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Inicia sesión para continuar.")
    if request.method not in SAFE_METHODS and not (csrf_token and tokens_match(csrf_token, session.csrf_token_hash)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Token CSRF inválido o ausente.")
    return session


CurrentSession = Annotated[UserSession, Depends(get_current_session)]


def get_current_user(session: CurrentSession) -> User:
    return session.user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> User:
    """Autorización en el servidor: el frontend nunca decide quién es administrador."""
    if not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Necesitas permisos de administrador.")
    return user


AdminUser = Annotated[User, Depends(require_admin)]
