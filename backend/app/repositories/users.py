import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import User, UserSession


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalars(select(User).where(User.email == email.lower())).one_or_none()


def get_valid_session(db: Session, token_hash: str) -> UserSession | None:
    stmt = (
        select(UserSession)
        .join(User)
        .where(UserSession.token_hash == token_hash, UserSession.expires_at > datetime.now(UTC), User.is_active)
    )
    return db.scalars(stmt).one_or_none()


def delete_session(db: Session, session_id: uuid.UUID) -> None:
    db.execute(delete(UserSession).where(UserSession.id == session_id))


def delete_expired_sessions(db: Session, user_id: uuid.UUID) -> None:
    db.execute(delete(UserSession).where(UserSession.user_id == user_id, UserSession.expires_at <= datetime.now(UTC)))
