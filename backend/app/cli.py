"""Administración de roles desde el servidor (nunca desde la web).

uv run python -m app.cli make-admin correo@dominio.com
uv run python -m app.cli revoke-admin correo@dominio.com
uv run python -m app.cli set-password correo@dominio.com < archivo   (lee la clave de stdin)
uv run python -m app.cli release-expired
uv run python -m app.cli housekeeping       (vencimientos y limpieza; para una tarea programada)
uv run python -m app.cli check-production   (revisa la configuración antes de publicar)
"""

import argparse
import sys

from pydantic import TypeAdapter, ValidationError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import User, UserSession
from app.modules.autenticacion.schemas import Password


def set_admin(email: str, value: bool) -> int:
    with SessionLocal() as db:
        user = db.scalars(select(User).where(User.email == email.lower())).one_or_none()
        if user is None:
            print(f"No existe un usuario con el correo {email}. Debe registrarse primero.", file=sys.stderr)
            return 1
        user.is_admin = value
        db.commit()
        print(f"{email}: is_admin={value}")
        return 0


def change_password(db: Session, email: str, password: str) -> bool:
    """Fija la contraseña de una cuenta existente y cierra sus sesiones."""
    TypeAdapter(Password).validate_python(password)
    user = db.scalars(select(User).where(User.email == email.lower())).one_or_none()
    if user is None:
        return False
    user.password_hash = hash_password(password)
    db.execute(delete(UserSession).where(UserSession.user_id == user.id))
    return True


def set_password(email: str) -> int:
    # Por stdin y no como argumento, para que la clave no quede en el historial ni en `ps`.
    password = sys.stdin.readline().rstrip("\n")
    with SessionLocal() as db:
        try:
            changed = change_password(db, email, password)
        except ValidationError:
            print("La contraseña no cumple la política (10+ caracteres, letras y números).", file=sys.stderr)
            return 2
        if not changed:
            print(f"No existe un usuario con el correo {email}.", file=sys.stderr)
            return 1
        db.commit()
    print(f"{email}: contraseña actualizada y sesiones cerradas.")
    return 0


def release_expired() -> int:
    from app.modules.inventario.reservations import release_expired as release
    from app.modules.pagos.service import expire_unpaid

    with SessionLocal() as db:
        removed = release(db)
        cancelled = expire_unpaid(db)
        db.commit()
    print(f"Reservas vencidas liberadas. Líneas de carrito retiradas: {removed}. Sin pagar cancelados: {cancelled}")
    return 0


def housekeeping() -> int:
    """Vence lo no pagado y borra datos que ya no se necesitan. Se puede repetir sin riesgo."""
    from datetime import timedelta

    from app.core.config import get_settings
    from app.models import GpsPosition, PasswordResetToken
    from app.modules.inventario.reservations import now_utc

    release_expired()
    now = now_utc()
    with SessionLocal() as db:
        positions = db.execute(
            delete(GpsPosition).where(GpsPosition.recorded_at < now - timedelta(days=get_settings().gps_retention_days))
        ).rowcount
        sessions = db.execute(delete(UserSession).where(UserSession.expires_at < now)).rowcount
        tokens = db.execute(delete(PasswordResetToken).where(PasswordResetToken.expires_at < now)).rowcount
        db.commit()
    print(f"Limpieza: {positions} posiciones GPS, {sessions} sesiones y {tokens} enlaces vencidos.")
    return 0


def production_problems(settings) -> tuple[list[str], list[str]]:
    """(errores que impiden publicar, avisos que conviene resolver)."""
    errors, warnings = [], []
    if settings.environment != "production":
        errors.append("ENVIRONMENT debe ser production.")
    if not settings.cookie_secure:
        errors.append("COOKIE_SECURE debe ser true.")
    if not settings.frontend_url.startswith("https://"):
        errors.append("FRONTEND_URL debe usar https://.")
    if any("localhost" in origin or "127.0.0.1" in origin for origin in settings.cors_origins):
        errors.append("CORS_ORIGINS no debe incluir localhost.")
    provider = settings.active_payment_provider
    if provider is None or provider == "simulado":
        errors.append("No hay forma de cobrar: configura Wompi o PAYMENT_PROVIDER=manual.")
    if provider == "manual" and not settings.payment_instructions.strip():
        errors.append("PAYMENT_INSTRUCTIONS es obligatorio con el pago manual.")
    if provider == "wompi" and settings.payments_sandbox:
        warnings.append("Wompi está en modo de pruebas (llaves pub_test_).")
    if not settings.smtp_host:
        warnings.append("Sin SMTP_HOST no se pueden recuperar contraseñas ni enviar comprobantes.")
    if not settings.company_nit:
        warnings.append("COMPANY_NIT está vacío: las facturas lo mostrarán como pendiente.")
    return errors, warnings


def check_production() -> int:
    from app.core.config import get_settings

    errors, warnings = production_problems(get_settings())
    for text in errors:
        print(f"ERROR: {text}", file=sys.stderr)
    for text in warnings:
        print(f"AVISO: {text}")
    if errors:
        return 1
    print("Configuración de producción correcta.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("make-admin", "revoke-admin", "set-password"):
        sub.add_parser(name).add_argument("email")
    sub.add_parser("release-expired")
    sub.add_parser("housekeeping")
    sub.add_parser("check-production")
    args = parser.parse_args()
    if args.command == "housekeeping":
        return housekeeping()
    if args.command == "check-production":
        return check_production()
    if args.command == "release-expired":
        return release_expired()
    if args.command == "set-password":
        return set_password(args.email)
    return set_admin(args.email, args.command == "make-admin")


if __name__ == "__main__":
    raise SystemExit(main())
