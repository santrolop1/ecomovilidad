from sqlalchemy import select

from app.models import User

from .conftest import PASSWORD, csrf, register


def test_registro_crea_usuario_con_contrasena_hasheada(client, db):
    session = register(client)
    assert session["user"]["email"] == "ana@correo.com"
    assert "passwordHash" not in session["user"]
    user = db.scalars(select(User).where(User.email == "ana@correo.com")).one()
    assert user.password_hash != PASSWORD
    assert user.password_hash.startswith("$argon2id$")


def test_registro_emite_cookie_httponly(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "firstName": "Luis",
            "lastName": "Gómez",
            "email": "LUIS@Correo.com",
            "phone": "3001112233",
            "password": PASSWORD,
            "dataConsent": True,
        },
    )
    cookies = response.headers.get_list("set-cookie")
    session_cookie = next(c for c in cookies if c.startswith("em_session="))
    assert "HttpOnly" in session_cookie and "SameSite=lax" in session_cookie
    assert response.json()["user"]["email"] == "luis@correo.com"


def test_registro_rechaza_correo_duplicado(client):
    register(client)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "firstName": "Ana",
            "lastName": "Otra",
            "email": "ana@correo.com",
            "phone": "3001234567",
            "password": PASSWORD,
            "dataConsent": True,
        },
    )
    assert response.status_code == 409


def test_registro_exige_contrasena_fuerte_y_consentimiento(client):
    base = {"firstName": "Ana", "lastName": "Pérez", "email": "x@correo.com", "phone": "3001234567"}
    assert (
        client.post("/api/v1/auth/register", json={**base, "password": "corta", "dataConsent": True}).status_code == 422
    )
    assert (
        client.post(
            "/api/v1/auth/register", json={**base, "password": "sololetrasaqui", "dataConsent": True}
        ).status_code
        == 422
    )
    assert (
        client.post("/api/v1/auth/register", json={**base, "password": PASSWORD, "dataConsent": False}).status_code
        == 422
    )


def test_login_y_me(client):
    register(client)
    client.cookies.clear()
    assert client.get("/api/v1/auth/me").status_code == 401

    response = client.post("/api/v1/auth/login", json={"email": "ANA@correo.com", "password": PASSWORD})
    assert response.status_code == 200
    assert client.get("/api/v1/auth/me").json()["firstName"] == "Ana"


def test_login_con_credenciales_invalidas(client):
    register(client)
    client.cookies.clear()
    wrong = client.post("/api/v1/auth/login", json={"email": "ana@correo.com", "password": "otra-clave-123"})
    missing = client.post("/api/v1/auth/login", json={"email": "nadie@correo.com", "password": PASSWORD})
    assert wrong.status_code == missing.status_code == 401
    assert wrong.json()["detail"] == missing.json()["detail"]  # no revela si el correo existe


def test_logout_exige_csrf_y_revoca_la_sesion(client):
    register(client)
    assert client.post("/api/v1/auth/logout").status_code == 403
    token = client.cookies["em_session"]

    assert client.post("/api/v1/auth/logout", headers=csrf(client)).status_code == 204
    # Aunque alguien conserve la cookie, la sesión ya no existe en el servidor.
    client.cookies.set("em_session", token)
    assert client.get("/api/v1/auth/me").status_code == 401


def test_cookie_falsa_no_autentica(client):
    client.cookies.set("em_session", "token-inventado")
    assert client.get("/api/v1/auth/me").status_code == 401
