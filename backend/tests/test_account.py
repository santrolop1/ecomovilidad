"""Cuenta del cliente: mis pedidos, perfil, contraseña, límite de login y consentimiento."""

import re
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import select, update

from app.core.email import EmailMessage, get_email_sender
from app.main import app
from app.models import ConsentRecord, LoginAttempt, PasswordResetToken, User, UserSession

from .conftest import PASSWORD, add_to_cart, csrf, register

NEW_PASSWORD = "otra-clave-segura-99"


def make_order(client, slug="patinova-city-80", quantity=1):
    product = client.get(f"/api/v1/products/{slug}").json()
    add_to_cart(client, product["id"], quantity)
    body = {
        "items": [{"productId": product["id"], "quantity": quantity}],
        "customer": {
            "fullName": "Ana Pérez",
            "email": "ana@correo.com",
            "phone": "3001234567",
            "documentType": "CC",
            "documentNumber": "1098765432",
        },
        "fulfillment": {
            "method": "domicilio",
            "address": "Calle 45 # 30-20",
            "city": "Floridablanca",
            "date": (date.today() + timedelta(days=1)).isoformat(),
            "timeSlotId": "slot-14",
        },
        "paymentMethod": "tarjeta",
        "dataConsent": True,
    }
    response = client.post("/api/v1/orders", json=body, headers=csrf(client))
    assert response.status_code == 201, response.text
    return response.json()


# ─── Mis pedidos ───────────────────────────────────────────────────────────


def test_mis_pedidos_lista_y_detalle(auth_client):
    order = make_order(auth_client, quantity=2)
    orders = auth_client.get("/api/v1/orders").json()
    assert [o["id"] for o in orders] == [order["id"]]
    detail = auth_client.get(f"/api/v1/orders/{order['id']}").json()
    assert detail["status"] == "pending"
    assert detail["itemCount"] == 2
    assert detail["deliveryCity"] == "Floridablanca" and detail["deliveryAddress"] == "Calle 45 # 30-20"
    assert detail["branchName"] and detail["paymentMethod"] == "tarjeta"
    assert detail["items"][0]["slug"] == "patinova-city-80"
    assert detail["items"][0]["imageUrl"] == "/images/products/patinova-city-80.webp"
    assert detail["contactEmail"] == "ana@correo.com"


def test_pedido_de_otro_usuario_es_404_y_sin_sesion_401(auth_client, client):
    order = make_order(auth_client)
    client.cookies.clear()
    assert client.get(f"/api/v1/orders/{order['id']}").status_code == 401
    register(client, email="intruso@correo.com")
    assert client.get(f"/api/v1/orders/{order['id']}").status_code == 404
    assert client.get("/api/v1/orders").json() == []


def test_admin_conserva_acceso_por_el_panel(admin_client, client):
    order = make_order(admin_client)
    assert admin_client.get(f"/api/v1/admin/orders/{order['id']}").status_code == 200


# ─── Perfil y contraseña ───────────────────────────────────────────────────


def test_editar_perfil(auth_client):
    response = auth_client.patch(
        "/api/v1/auth/me",
        json={"firstName": " Ana María ", "phone": "3109998877", "documentNumber": "1098765432"},
        headers=csrf(auth_client),
    )
    assert response.status_code == 200
    assert response.json()["firstName"] == "Ana María" and response.json()["documentNumber"] == "1098765432"


@pytest.mark.parametrize("field", ["isAdmin", "email", "passwordHash", "isActive"])
def test_perfil_no_permite_campos_de_autorizacion(auth_client, db, field):
    response = auth_client.patch("/api/v1/auth/me", json={field: True}, headers=csrf(auth_client))
    assert response.status_code == 422
    user = db.scalars(select(User).where(User.email == "ana@correo.com")).one()
    assert user.is_admin is False


def test_cambiar_contrasena_cierra_las_demas_sesiones(auth_client, db):
    db.add(
        UserSession(
            user_id=db.scalars(select(User.id).where(User.email == "ana@correo.com")).one(),
            token_hash="b" * 64,
            csrf_token_hash="c" * 64,
            expires_at=datetime.now(UTC) + timedelta(days=1),
        )
    )
    db.flush()
    wrong = auth_client.post(
        "/api/v1/auth/password",
        json={"currentPassword": "mala", "newPassword": NEW_PASSWORD},
        headers=csrf(auth_client),
    )
    assert wrong.status_code == 400
    ok = auth_client.post(
        "/api/v1/auth/password",
        json={"currentPassword": PASSWORD, "newPassword": NEW_PASSWORD},
        headers=csrf(auth_client),
    )
    assert ok.status_code == 204
    assert auth_client.get("/api/v1/auth/me").status_code == 200  # la sesión actual sigue
    assert db.scalar(select(UserSession).where(UserSession.token_hash == "b" * 64)) is None
    auth_client.cookies.clear()
    login = auth_client.post("/api/v1/auth/login", json={"email": "ana@correo.com", "password": NEW_PASSWORD})
    assert login.status_code == 200


# ─── Recuperación de contraseña ────────────────────────────────────────────


class Outbox:
    def __init__(self):
        self.messages: list[EmailMessage] = []

    def send(self, message: EmailMessage) -> None:
        self.messages.append(message)

    def token(self) -> str:
        match = re.search(r"token=([A-Za-z0-9_-]+)", self.messages[-1].body)
        assert match
        return match.group(1)


@pytest.fixture
def outbox():
    box = Outbox()
    app.dependency_overrides[get_email_sender] = lambda: box
    yield box
    app.dependency_overrides.pop(get_email_sender, None)


def test_solicitud_no_revela_si_la_cuenta_existe(client, outbox):
    register(client)
    a = client.post("/api/v1/auth/password-reset/request", json={"email": "ana@correo.com"})
    b = client.post("/api/v1/auth/password-reset/request", json={"email": "nadie@correo.com"})
    assert a.status_code == b.status_code == 202
    assert a.json() == b.json()
    assert len(outbox.messages) == 1 and outbox.messages[0].to == "ana@correo.com"


def test_token_se_guarda_como_hash(client, outbox, db):
    register(client)
    client.post("/api/v1/auth/password-reset/request", json={"email": "ana@correo.com"})
    stored = db.scalars(select(PasswordResetToken)).one()
    assert stored.token_hash != outbox.token() and len(stored.token_hash) == 64


def test_restablecer_contrasena_invalida_sesiones(client, outbox, db):
    register(client)
    client.post("/api/v1/auth/password-reset/request", json={"email": "ana@correo.com"})
    token = outbox.token()
    response = client.post("/api/v1/auth/password-reset/confirm", json={"token": token, "newPassword": NEW_PASSWORD})
    assert response.status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401  # sesión anterior revocada
    assert (
        client.post("/api/v1/auth/login", json={"email": "ana@correo.com", "password": NEW_PASSWORD}).status_code == 200
    )
    # Un solo uso.
    again = client.post("/api/v1/auth/password-reset/confirm", json={"token": token, "newPassword": NEW_PASSWORD})
    assert again.status_code == 400


def test_token_invalido_o_vencido(client, outbox, db):
    register(client)
    bad = client.post("/api/v1/auth/password-reset/confirm", json={"token": "x" * 43, "newPassword": NEW_PASSWORD})
    assert bad.status_code == 400
    client.post("/api/v1/auth/password-reset/request", json={"email": "ana@correo.com"})
    db.execute(update(PasswordResetToken).values(expires_at=datetime.now(UTC) - timedelta(minutes=1)))
    db.flush()
    expired = client.post(
        "/api/v1/auth/password-reset/confirm", json={"token": outbox.token(), "newPassword": NEW_PASSWORD}
    )
    assert expired.status_code == 400


def test_nueva_contrasena_debe_ser_segura(client, outbox):
    register(client)
    client.post("/api/v1/auth/password-reset/request", json={"email": "ana@correo.com"})
    weak = client.post("/api/v1/auth/password-reset/confirm", json={"token": outbox.token(), "newPassword": "corta"})
    assert weak.status_code == 422


def test_solicitudes_limitadas_por_hora(client, outbox):
    register(client)
    for _ in range(5):
        client.post("/api/v1/auth/password-reset/request", json={"email": "ana@correo.com"})
    assert len(outbox.messages) == 3


# ─── Límite de intentos de login ───────────────────────────────────────────


def test_bloqueo_tras_5_fallos_por_cuenta(client):
    register(client)
    client.cookies.clear()
    for _ in range(5):
        assert (
            client.post("/api/v1/auth/login", json={"email": "ana@correo.com", "password": "mala-123"}).status_code
            == 401
        )
    blocked = client.post("/api/v1/auth/login", json={"email": "ana@correo.com", "password": PASSWORD})
    assert blocked.status_code == 429  # ni siquiera con la contraseña correcta


def test_bloqueo_uniforme_para_correos_inexistentes(client):
    for _ in range(5):
        client.post("/api/v1/auth/login", json={"email": "fantasma@correo.com", "password": "mala-123"})
    response = client.post("/api/v1/auth/login", json={"email": "fantasma@correo.com", "password": "mala-123"})
    assert response.status_code == 429


def test_exito_reinicia_el_contador(client, db):
    register(client)
    client.cookies.clear()
    for _ in range(4):
        client.post("/api/v1/auth/login", json={"email": "ana@correo.com", "password": "mala-123"})
    assert client.post("/api/v1/auth/login", json={"email": "ana@correo.com", "password": PASSWORD}).status_code == 200
    assert db.scalar(select(LoginAttempt).where(LoginAttempt.succeeded.is_(False))) is None


def test_bloqueo_por_ip(client, db):
    for i in range(30):
        db.add(LoginAttempt(email_hash=f"{i:064d}", ip_address="testclient", succeeded=False))
    db.flush()
    register(client)
    client.cookies.clear()
    assert client.post("/api/v1/auth/login", json={"email": "ana@correo.com", "password": PASSWORD}).status_code == 429


def test_intentos_antiguos_no_cuentan(client, db):
    register(client)
    client.cookies.clear()
    for _ in range(5):
        client.post("/api/v1/auth/login", json={"email": "ana@correo.com", "password": "mala-123"})
    db.execute(update(LoginAttempt).values(created_at=datetime.now(UTC) - timedelta(minutes=16)))
    db.flush()
    assert client.post("/api/v1/auth/login", json={"email": "ana@correo.com", "password": PASSWORD}).status_code == 200


# ─── Consentimiento Ley 1581 ───────────────────────────────────────────────


def test_registro_guarda_evidencia_de_consentimiento(client, db):
    session = register(client, policyVersion="2026-10-06")
    record = db.scalars(select(ConsentRecord).where(ConsentRecord.user_id == session["user"]["id"])).one()
    assert record.purpose == "registro" and record.policy_version == "2026-10-06"
    assert record.accepted_at is not None and record.order_id is None


def test_pedido_guarda_evidencia_con_el_pedido(auth_client, db):
    order = make_order(auth_client)
    records = auth_client.get("/api/v1/auth/me/consents").json()
    assert {r["purpose"] for r in records} == {"registro", "pedido"}
    assert next(r for r in records if r["purpose"] == "pedido")["orderId"] == order["id"]


def test_registro_con_politica_desactualizada(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "firstName": "Ana",
            "lastName": "Pérez",
            "email": "x@correo.com",
            "phone": "3001234567",
            "password": PASSWORD,
            "dataConsent": True,
            "policyVersion": "2020-01-01",
        },
    )
    assert response.status_code == 409


def test_proxy_de_confianza_sin_ip_no_bloquea_a_todos(client, db, monkeypatch):
    """Los fallos de muchos usuarios que llegan desde el servidor de Next.js
    (misma IP, sin X-Forwarded-For) no deben bloquear el login de todos."""
    from app.api import client_ip as module

    # TestClient se conecta como "testclient": lo tratamos como proxy de confianza.
    monkeypatch.setattr(module, "_trusted", lambda peer: True)
    for i in range(30):
        db.add(LoginAttempt(email_hash=f"{i:064d}", ip_address="10.0.0.5", succeeded=False))
    db.flush()
    register(client)
    client.cookies.clear()
    ok = client.post("/api/v1/auth/login", json={"email": "ana@correo.com", "password": PASSWORD})
    assert ok.status_code == 200
    # Con X-Forwarded-For de un proxy de confianza, la IP del navegador sí se limita.
    for i in range(30):
        db.add(LoginAttempt(email_hash=f"{i:064d}", ip_address="203.0.113.7", succeeded=False))
    db.flush()
    client.cookies.clear()
    blocked = client.post(
        "/api/v1/auth/login",
        json={"email": "ana@correo.com", "password": PASSWORD},
        headers={"X-Forwarded-For": "203.0.113.7"},
    )
    assert blocked.status_code == 429


def test_contrato_pedido_de_recogida_sin_campos_nulos(auth_client):
    """El frontend valida con Zod: los campos opcionales se omiten, no llegan como null."""
    product = auth_client.get("/api/v1/products/patinova-city-80").json()
    add_to_cart(auth_client, product["id"])
    body = {
        "items": [{"productId": product["id"], "quantity": 1}],
        "customer": {
            "fullName": "Ana Pérez",
            "email": "ana@correo.com",
            "phone": "3001234567",
            "documentType": "CC",
            "documentNumber": "1098765432",
        },
        "fulfillment": {
            "method": "recogida",
            "branchId": product["stock"]["byBranch"][0]["branchId"],
            "date": (date.today() + timedelta(days=1)).isoformat(),
            "timeSlotId": "slot-10",
        },
        "paymentMethod": "pse",
        "dataConsent": True,
    }
    order = auth_client.post("/api/v1/orders", json=body, headers=csrf(auth_client)).json()
    for payload in (
        order,
        auth_client.get(f"/api/v1/orders/{order['id']}").json(),
        auth_client.get("/api/v1/orders").json()[0],
    ):
        assert "deliveryAddress" not in payload and "deliveryCity" not in payload
        assert None not in payload.values()
