"""Contraseñas (argon2id) y tokens de sesión opacos."""

import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

_hasher = PasswordHasher()  # argon2id con parámetros recomendados por la librería

# Hash de referencia para igualar el tiempo de respuesta cuando el correo no existe.
_DUMMY_HASH = _hasher.hash("contraseña-de-referencia-no-usada")

SESSION_COOKIE = "em_session"
CSRF_COOKIE = "em_csrf"
CSRF_HEADER = "X-CSRF-Token"


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def new_token() -> str:
    """Token aleatorio de 256 bits, apto para cookies."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Los tokens se guardan solo como SHA-256: una fuga de la BD no permite suplantar sesiones."""
    return hashlib.sha256(token.encode()).hexdigest()


def tokens_match(token: str, expected_hash: str) -> bool:
    return secrets.compare_digest(hash_token(token), expected_hash)
