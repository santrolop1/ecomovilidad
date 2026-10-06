from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models import Branch, Product, Rental, User


def make_rental(db, user, start, end):
    product = db.scalars(select(Product).limit(1)).first()
    branch = db.scalars(select(Branch).limit(1)).first()
    rental = Rental(
        user_id=user.id, product_id=product.id, branch_id=branch.id, start_at=start, end_at=end, price=65_000
    )
    db.add(rental)
    db.flush()
    return rental


def test_alquileres_requieren_sesion(client):
    assert client.get("/api/v1/rentals").status_code == 401


def test_lista_los_alquileres_del_usuario(auth_client, db):
    user = db.scalars(select(User).where(User.email == "ana@correo.com")).one()
    start = datetime.now(UTC) + timedelta(days=1)
    make_rental(db, user, start, start + timedelta(hours=4))
    rentals = auth_client.get("/api/v1/rentals").json()
    assert len(rentals) == 1 and rentals[0]["status"] == "pending" and rentals[0]["price"] == 65_000


def test_alquiler_debe_terminar_despues_de_empezar(auth_client, db):
    user = db.scalars(select(User).where(User.email == "ana@correo.com")).one()
    start = datetime.now(UTC)
    with pytest.raises(IntegrityError):
        make_rental(db, user, start, start - timedelta(hours=1))
    db.rollback()
