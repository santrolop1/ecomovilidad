"""Administración de roles desde el servidor (nunca desde la web).

uv run python -m app.cli make-admin correo@dominio.com
uv run python -m app.cli revoke-admin correo@dominio.com
"""

import argparse
import sys

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import User


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


def release_expired() -> int:
    from app.services.reservations import release_expired as release

    with SessionLocal() as db:
        removed = release(db)
        db.commit()
    print(f"Reservas vencidas liberadas. Líneas de carrito retiradas: {removed}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("make-admin", "revoke-admin"):
        sub.add_parser(name).add_argument("email")
    sub.add_parser("release-expired")
    args = parser.parse_args()
    if args.command == "release-expired":
        return release_expired()
    return set_admin(args.email, args.command == "make-admin")


if __name__ == "__main__":
    raise SystemExit(main())
