from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.client_ip import ClientIp
from app.core.config import get_settings
from app.core.email import EmailMessage, EmailSender
from app.core.security import hash_password, hash_token, needs_rehash, new_token, verify_password
from app.models import PasswordResetToken, User, UserSession
from app.models.enums import ConsentPurpose
from app.repositories import users as repo
from app.schemas.auth import LoginIn, PasswordChangeIn, PasswordResetConfirmIn, ProfileUpdateIn, RegisterIn

from . import consent, login_guard
from .errors import ConflictError, ServiceError, UnauthorizedError

INVALID_CREDENTIALS = "Correo o contraseña incorrectos."
INVALID_RESET = "El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo."
MAX_RESET_REQUESTS_PER_HOUR = 3


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
    consent.ensure_current_policy(data.policy_version)
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
    # Evidencia de la autorización (Ley 1581): quién, cuándo y qué versión.
    consent.record_consent(db, user.id, ConsentPurpose.REGISTRATION)
    return _issue_session(db, user)


def login(db: Session, data: LoginIn, ip: ClientIp) -> IssuedSession:
    login_guard.ensure_allowed(db, data.email, ip.address, check_ip=ip.reliable)
    user = repo.get_user_by_email(db, data.email)
    # verify_password se ejecuta aunque el usuario no exista (mismo tiempo de respuesta).
    valid = verify_password(user.password_hash if user else None, data.password) and user is not None and user.is_active
    login_guard.record(db, data.email, ip.address, succeeded=valid)
    if not valid or user is None:
        db.commit()
        raise UnauthorizedError(INVALID_CREDENTIALS)
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(data.password)
    return _issue_session(db, user)


def resolve_session(db: Session, token: str | None) -> UserSession | None:
    return repo.get_valid_session(db, hash_token(token)) if token else None


def logout(db: Session, session: UserSession) -> None:
    repo.delete_session(db, session.id)
    db.commit()


def update_profile(db: Session, user: User, data: ProfileUpdateIn) -> User:
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None and field != "document_number":
            raise ServiceError("Hay campos obligatorios vacíos.")
        setattr(user, field, value or None if field == "document_number" else value)
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, session: UserSession, data: PasswordChangeIn, ip: ClientIp) -> None:
    user = session.user
    login_guard.ensure_allowed(db, user.email, ip.address, check_ip=ip.reliable)
    if not verify_password(user.password_hash, data.current_password):
        login_guard.record(db, user.email, ip.address, succeeded=False)
        db.commit()
        raise ServiceError("La contraseña actual no es correcta.")
    user.password_hash = hash_password(data.new_password)
    # Cierra las demás sesiones: si alguien más tenía acceso, lo pierde.
    db.execute(delete(UserSession).where(UserSession.user_id == user.id, UserSession.id != session.id))
    db.commit()


def request_password_reset(db: Session, email: str, sender: EmailSender) -> None:
    """Siempre responde igual. Si la cuenta existe y está activa, envía un enlace
    de un solo uso. El token solo se guarda como hash."""
    user = repo.get_user_by_email(db, email)
    if user is None or not user.is_active:
        return
    hour_ago = datetime.now(UTC) - timedelta(hours=1)
    recent = db.scalar(
        select(func.count())
        .select_from(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.created_at > hour_ago)
    )
    if (recent or 0) >= MAX_RESET_REQUESTS_PER_HOUR:
        return
    settings = get_settings()
    # Un enlace nuevo invalida los anteriores sin usar (se marcan, no se borran,
    # para que sigan contando en el límite por hora).
    db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=datetime.now(UTC))
    )
    token = new_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=datetime.now(UTC) + timedelta(minutes=settings.password_reset_ttl_minutes),
        )
    )
    db.commit()
    link = f"{settings.frontend_url.rstrip('/')}/recuperar/nueva?token={token}"
    sender.send(
        EmailMessage(
            to=user.email,
            subject="Restablece tu contraseña de EcoMovilidad",
            body=(
                f"Hola {user.first_name}:\n\nPara crear una nueva contraseña abre este enlace "
                f"(vence en {settings.password_reset_ttl_minutes} minutos y sirve una sola vez):\n{link}\n\n"
                "Si no lo pediste, ignora este mensaje."
            ),
        )
    )


def confirm_password_reset(db: Session, data: PasswordResetConfirmIn) -> None:
    record = db.scalars(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_token(data.token)).with_for_update()
    ).one_or_none()
    if record is None or record.used_at is not None or record.expires_at <= datetime.now(UTC):
        raise ServiceError(INVALID_RESET)
    user = db.get(User, record.user_id)
    if user is None or not user.is_active:
        raise ServiceError(INVALID_RESET)
    user.password_hash = hash_password(data.new_password)
    record.used_at = datetime.now(UTC)
    # Todas las sesiones abiertas dejan de valer.
    db.execute(delete(UserSession).where(UserSession.user_id == user.id))
    db.commit()
