"""Pruebas contra PostgreSQL + PostGIS real (base `ecomovilidad_test` del
docker compose). Cada prueba corre dentro de una transacción que se revierte."""

import os
from collections.abc import Iterator

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Connection, create_engine
from sqlalchemy.orm import Session

from alembic import command
from app.db.seed import seed
from app.db.session import get_db
from app.main import app

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://ecomovilidad:CAMBIAR@localhost:5433/ecomovilidad_test"
)

PASSWORD = "clave-segura-2026"


@pytest.fixture(scope="session")
def engine():
    config = Config("alembic.ini")
    config.attributes["database_url"] = TEST_DATABASE_URL
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    engine = create_engine(TEST_DATABASE_URL)
    with Session(engine) as session:
        seed(session)
    yield engine
    engine.dispose()


@pytest.fixture
def connection(engine) -> Iterator[Connection]:
    with engine.connect() as conn:
        transaction = conn.begin()
        yield conn
        transaction.rollback()


@pytest.fixture
def db(connection: Connection) -> Iterator[Session]:
    # Los commit de los servicios se convierten en SAVEPOINT dentro de la transacción de la prueba.
    with Session(bind=connection, join_transaction_mode="create_savepoint", expire_on_commit=False) as session:
        yield session


@pytest.fixture
def client(db: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app, base_url="http://testserver") as test_client:
        yield test_client
    app.dependency_overrides.clear()


def register(client: TestClient, email: str = "ana@correo.com", **overrides) -> dict:
    body = {
        "firstName": "Ana",
        "lastName": "Pérez",
        "email": email,
        "phone": "300 123 4567",
        "password": PASSWORD,
        "dataConsent": True,
        **overrides,
    }
    response = client.post("/api/v1/auth/register", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def csrf(client: TestClient) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies["em_csrf"]}


def add_to_cart(client: TestClient, product_id: str, quantity: int = 1) -> dict:
    """RF 6.2: un pedido se crea desde el carrito con reserva vigente."""
    response = client.post(
        "/api/v1/cart/items", json={"productId": product_id, "quantity": quantity}, headers=csrf(client)
    )
    assert response.status_code == 200, response.text
    return response.json()


@pytest.fixture
def auth_client(client: TestClient) -> TestClient:
    register(client)
    return client


@pytest.fixture
def admin_client(client: TestClient, db: Session) -> TestClient:
    """Usuario registrado normalmente y promovido en la base (como haría app.cli)."""
    from sqlalchemy import update

    from app.models import User

    register(client, email="admin@correo.com")
    db.execute(update(User).where(User.email == "admin@correo.com").values(is_admin=True))
    db.commit()  # en pruebas libera un SAVEPOINT; la transacción externa igual se revierte
    return client
