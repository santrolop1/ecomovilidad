"""Formulario de contacto: lo deja cualquiera, con límite, y lo atiende el panel."""

import pytest

from app.core.errors import TooManyRequestsError
from app.modules.contacto.schemas import ContactMessageIn
from app.modules.contacto.service import create_message

from .conftest import csrf, register
from .test_admin import A

C = "/api/v1/contact"
BODY = {
    "fullName": "Ana Pérez",
    "email": "Ana@Correo.com",
    "phone": "3001234567",
    "topic": "alquiler",
    "message": "Quiero saber si alquilan bicicletas por semana.",
    "dataConsent": True,
}


def test_cualquiera_deja_un_mensaje_sin_iniciar_sesion(client):
    response = client.post(C, json=BODY)
    assert response.status_code == 201 and response.json()["id"]


def test_panel_lista_y_marca_atendido(admin_client):
    assert admin_client.post(C, json=BODY).status_code == 201
    page = admin_client.get(f"{A}/contact-messages").json()
    assert (
        page["total"] == 1 and page["items"][0]["email"] == "ana@correo.com" and page["items"][0]["status"] == "nuevo"
    )
    url = f"{A}/contact-messages/{page['items'][0]['id']}"
    assert (
        admin_client.patch(url, json={"status": "atendido"}, headers=csrf(admin_client)).json()["status"] == "atendido"
    )
    assert admin_client.get(f"{A}/contact-messages", params={"state": "nuevo"}).json()["total"] == 0
    assert admin_client.get(f"{A}/contact-messages", params={"state": "atendido"}).json()["total"] == 1


def test_datos_invalidos_y_sin_autorizacion(client):
    assert client.post(C, json={**BODY, "dataConsent": False}).status_code == 422
    assert client.post(C, json={**BODY, "message": "corto"}).status_code == 422
    assert client.post(C, json={**BODY, "topic": "spam"}).status_code == 422


def test_limite_de_mensajes_por_correo(client):
    for _ in range(3):
        assert client.post(C, json=BODY).status_code == 201
    assert client.post(C, json=BODY).status_code == 429
    assert client.post(C, json={**BODY, "email": "otra@correo.com"}).status_code == 201


def test_limite_de_mensajes_por_ip(db):
    def send(n, ip):
        data = ContactMessageIn.model_validate({**BODY, "email": f"p{n}@correo.com"})
        return create_message(db, data, ip)

    for n in range(10):
        send(n, "203.0.113.9")
    with pytest.raises(TooManyRequestsError):
        send(11, "203.0.113.9")
    assert send(12, "203.0.113.10").id


def test_solo_administradores_ven_los_mensajes(client):
    register(client, email="curioso@correo.com")
    assert client.get(f"{A}/contact-messages").status_code == 403
