from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password, hash_token, needs_rehash, new_token, verify_password
from app.models import User, UserSession
from app.repositories import users as repo
from app.schemas.auth import LoginIn, RegisterIn

from .errors import ConflictError, UnauthorizedError

INVALID_CREDENTIALS = "Correo o contraseña incorrectos."


@dataclass
class IssuedSession:
    user: User
    token: str
    csrf_token: str
    expires_at: datetime


def _issue_session(db: Session, user: User) -> IssuedSession:
    token, csrf_token = new_token(), new_token()
    expires_at = datetime.now(UTC) + timedelta(hours=get_settings().session_ttl_hours)
    repo.delete_expired_sessions(db, user.id)
    db.add(
        UserSession(
            user_id=user.id, token_hash=hash_token(token), csrf_token_hash=hash_token(csrf_token), expires_at=expires_at
        )
    )
    db.commit()
    return IssuedSession(user=user, token=token, csrf_token=csrf_token, expires_at=expires_at)


def register(db: Session, data: RegisterIn) -> IssuedSession:
    if repo.get_user_by_email(db, data.email):
        raise ConflictError("Ya existe una cuenta con ese correo.")
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError as error:  # registro simultáneo con el mismo correo
        db.rollback()
        raise ConflictError("Ya existe una cuenta con ese correo.") from error
    return _issue_session(db, user)


def login(db: Session, data: LoginIn) -> IssuedSession:
    user = repo.get_user_by_email(db, data.email)
    # verify_password se ejecuta aunque el usuario no exista (mismo tiempo de respuesta).
    if not verify_password(user.password_hash if user else None, data.password) or not user or not user.is_active:
        raise UnauthorizedError(INVALID_CREDENTIALS)
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(data.password)
    return _issue_session(db, user)


def resolve_session(db: Session, token: str | None) -> UserSession | None:
    return repo.get_valid_session(db, hash_token(token)) if token else None


def logout(db: Session, session: UserSession) -> None:
    repo.delete_session(db, session.id)
    db.commit()
