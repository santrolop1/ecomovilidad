import ipaddress
from dataclasses import dataclass

from fastapi import Request

from app.core.config import get_settings


@dataclass(frozen=True)
class ClientIp:
    address: str
    # False cuando la conexión viene de un proxy de confianza (p. ej. el
    # servidor de Next.js) que no informó la IP del navegador: esa IP es la
    # del proxy y no debe usarse para limitar a un cliente concreto.
    reliable: bool


def _trusted(peer: str) -> bool:
    try:
        address = ipaddress.ip_address(peer)
    except ValueError:
        return False
    return any(address in ipaddress.ip_network(net, strict=False) for net in get_settings().trusted_proxies)


def client_ip(request: Request) -> ClientIp:
    """IP del cliente. X-Forwarded-For solo se acepta si la conexión viene de
    un proxy de confianza (TRUSTED_PROXIES)."""
    peer = request.client.host if request.client else "desconocida"
    if not _trusted(peer):
        return ClientIp(peer, reliable=True)
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    try:
        return ClientIp(str(ipaddress.ip_address(forwarded)), reliable=True)
    except ValueError:
        return ClientIp(peer, reliable=False)
