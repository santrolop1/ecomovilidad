"""Preparación para producción: correo, pago manual, limpieza y revisión de configuración."""

import smtplib
from datetime import timedelta

from sqlalchemy import select

import app.cli as cli
from app.cli import production_problems
from app.core.config import Settings, get_settings
from app.core.email import EmailMessage, SmtpEmailSender, get_email_sender
from app.main import app as api
from app.models import GpsDevice, GpsPosition
from app.modules.inventario.reservations import now_utc
from app.modules.pagos.gateway import ManualGateway, get_payment_gateway

from .conftest import csrf, register
from .test_admin import A, place_order, stock

P = "/api/v1/payments"


def settings(**overrides) -> Settings:
    values = {
        "_env_file": None,
        "database_url": "postgresql+psycopg://usuario@localhost/base",
        "environment": "production",
        "cookie_secure": True,
        "frontend_url": "https://ecomovilidad.co",
        "cors_origins": ["https://ecomovilidad.co"],
        "payment_provider": "manual",
        "payment_instructions": "Transferir a la cuenta 123.",
        "smtp_host": "smtp.ejemplo.com",
        "company_nit": "900123456",
    }
    return Settings(**{**values, **overrides})


def test_configuracion_completa_no_reporta_problemas():
    assert production_problems(settings()) == ([], [])


def test_detecta_configuracion_insegura():
    errors, _ = production_problems(
        settings(
            environment="development",
            cookie_secure=False,
            frontend_url="http://localhost:3000",
            cors_origins=["http://localhost:3000"],
            payment_instructions="",
        )
    )
    assert len(errors) == 5


def test_sin_forma_de_cobrar_no_se_puede_publicar_y_avisa_lo_opcional():
    errors, warnings = production_problems(settings(payment_provider="auto", smtp_host="", company_nit=""))
    assert any("cobrar" in e for e in errors)
    assert len(warnings) == 2


def test_la_pasarela_simulada_nunca_pasa_la_revision():
    errors, _ = production_problems(settings(payment_provider="simulado"))
    assert any("cobrar" in e for e in errors)


class FakeSmtp:
    sent: list = []
    fail = False

    def __init__(self, host, port, timeout):
        self.host = host

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def starttls(self):
        FakeSmtp.sent.append("starttls")

    def login(self, user, password):
        FakeSmtp.sent.append(("login", user))

    def send_message(self, message):
        if FakeSmtp.fail:
            raise smtplib.SMTPException("caído")
        FakeSmtp.sent.append(message)


def test_correo_por_smtp(monkeypatch):
    FakeSmtp.sent, FakeSmtp.fail = [], False
    monkeypatch.setattr(smtplib, "SMTP", FakeSmtp)
    config = settings(smtp_user="envios", smtp_password="x", smtp_from="hola@ecomovilidad.co")
    SmtpEmailSender(config).send(EmailMessage(to="ana@correo.com", subject="Hola", body="Texto"))
    assert FakeSmtp.sent[:2] == ["starttls", ("login", "envios")]
    assert FakeSmtp.sent[2]["To"] == "ana@correo.com" and FakeSmtp.sent[2]["From"] == "hola@ecomovilidad.co"


def test_si_el_correo_falla_no_rompe_la_operacion(monkeypatch):
    FakeSmtp.sent, FakeSmtp.fail = [], True
    monkeypatch.setattr(smtplib, "SMTP", FakeSmtp)
    SmtpEmailSender(settings()).send(EmailMessage(to="a@correo.com", subject="Hola", body="Texto"))


def test_elige_smtp_cuando_esta_configurado(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.ejemplo.com")
    get_settings.cache_clear()
    try:
        assert isinstance(get_email_sender(), SmtpEmailSender)
    finally:
        get_settings.cache_clear()


def start_manual(client, db):
    config = get_settings()
    api.dependency_overrides[get_payment_gateway] = lambda: ManualGateway(config, db)
    order, pid, bid = place_order(client)
    started = client.post(P, json={"orderId": order["id"]}, headers=csrf(client))
    assert started.status_code == 201, started.text
    return order, started.json(), pid, bid


def resolve(client, reference, approved, note=None):
    return client.post(
        f"{A}/payments/{reference}/resolve", json={"approved": approved, "note": note}, headers=csrf(client)
    )


def test_pago_manual_lo_confirma_el_panel_y_descuenta_una_vez(admin_client, db):
    order, started, pid, bid = start_manual(admin_client, db)
    assert "/pagos/manual?referencia=" in started["checkoutUrl"]
    info = admin_client.get(f"{P}/manual/{started['reference']}").json()
    assert info["status"] == "pending" and info["amount"] == order["total"] and info["targetId"] == order["id"]

    before = stock(db, pid, bid)
    assert resolve(admin_client, started["reference"], True).status_code == 204
    assert admin_client.get(f"/api/v1/orders/{order['id']}").json()["status"] == "paid"
    assert stock(db, pid, bid) == (before[0], before[1] - 2, before[2] - 2)
    assert resolve(admin_client, started["reference"], True).status_code == 409
    assert stock(db, pid, bid) == (before[0], before[1] - 2, before[2] - 2)


def test_el_cliente_no_puede_aprobar_su_pago_manual(admin_client, db):
    _, started, _, _ = start_manual(admin_client, db)
    url = f"{P}/simulator/{started['reference']}"
    assert admin_client.post(url, json={"decision": "approved"}, headers=csrf(admin_client)).status_code == 404
    admin_client.post(f"{P}/verify", json={"transactionId": "MAN-1"}, headers=csrf(admin_client))
    assert admin_client.get(f"{P}/manual/{started['reference']}").json()["status"] == "pending"


def test_rechazar_pago_manual_deja_el_pedido_pendiente(admin_client, db):
    order, started, _, _ = start_manual(admin_client, db)
    assert resolve(admin_client, started["reference"], False, "No llegó la transferencia").status_code == 204
    assert admin_client.get(f"/api/v1/orders/{order['id']}").json()["status"] == "pending"
    payment = admin_client.get(f"{A}/orders/{order['id']}").json()["payments"][0]
    assert payment["status"] == "declined" and payment["statusMessage"] == "No llegó la transferencia"


def test_otro_usuario_no_ve_el_pago_manual_ni_lo_resuelve(admin_client, db):
    _, started, _, _ = start_manual(admin_client, db)
    admin_client.cookies.clear()
    register(admin_client, email="ajeno@correo.com")
    assert admin_client.get(f"{P}/manual/{started['reference']}").status_code == 404
    assert resolve(admin_client, started["reference"], True).status_code == 403


def test_limpieza_borra_solo_posiciones_viejas(db, monkeypatch):
    device = GpsDevice(code="OLD", kind="domicilio", token_hash="h" * 64)
    db.add(device)
    db.flush()
    now = now_utc()
    db.add(GpsPosition(device_id=device.id, latitude=7.1, longitude=-73.1, recorded_at=now - timedelta(days=200)))
    db.add(GpsPosition(device_id=device.id, latitude=7.1, longitude=-73.1, recorded_at=now - timedelta(days=1)))
    db.flush()

    class SharedSession:
        def __call__(self):
            return self

        def __enter__(self):
            return db

        def __exit__(self, *_):
            return False

    monkeypatch.setattr(cli, "SessionLocal", SharedSession())
    assert cli.housekeeping() == 0
    assert len(db.scalars(select(GpsPosition).where(GpsPosition.device_id == device.id)).all()) == 1
