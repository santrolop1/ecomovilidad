"""Administración de roles desde el servidor (nunca desde la web).

uv run python -m app.cli make-admin correo@dominio.com
uv run python -m app.cli revoke-admin correo@dominio.com
uv run python -m app.cli set-password correo@dominio.com < archivo   (lee la clave de stdin)
uv run python -m app.cli release-expired
"""

import argparse
import sys

from pydantic import TypeAdapter, ValidationError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import User, UserSession
from app.schemas.auth import Password


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
    from app.services.payments.service import expire_unpaid
    from app.services.reservations import release_expired as release

    with SessionLocal() as db:
        removed = release(db)
        cancelled = expire_unpaid(db)
        db.commit()
    print(f"Reservas vencidas liberadas. Líneas de carrito retiradas: {removed}. Sin pagar cancelados: {cancelled}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("make-admin", "revoke-admin", "set-password"):
        sub.add_parser(name).add_argument("email")
    sub.add_parser("release-expired")
    args = parser.parse_args()
    if args.command == "release-expired":
        return release_expired()
    if args.command == "set-password":
        return set_password(args.email)
    return set_admin(args.email, args.command == "make-admin")


if __name__ == "__main__":
    raise SystemExit(main())
