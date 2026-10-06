import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.models import Branch, Inventory


def test_conexion_y_postgis(db):
    assert db.execute(text("SELECT 1")).scalar_one() == 1
    assert db.execute(text("SELECT postgis_lib_version()")).scalar_one().startswith("3.")


def test_api_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_ubicacion_geografica_generada_y_consultable(db):
    # Distancia real entre dos sucursales usando la columna geography.
    meters = db.execute(
        text(
            "SELECT ST_Distance(a.location, b.location) FROM branches a, branches b "
            "WHERE a.slug = 'bucaramanga-cabecera' AND b.slug = 'piedecuesta-centro'"
        )
    ).scalar_one()
    assert 14_000 < meters < 17_000


def test_inventario_no_admite_cantidades_negativas(db):
    inventory = db.scalars(select(Inventory).limit(1)).one()
    inventory.available_quantity = -1
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


def test_inventario_reservado_no_supera_total(db):
    inventory = db.scalars(select(Inventory).limit(1)).one()
    inventory.reserved_quantity = inventory.total_quantity + 1
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


def test_sucursal_fuera_del_area_metropolitana_es_rechazada(db):
    db.add(
        Branch(
            slug="bogota",
            name="Bogotá",
            address="Calle 1",
            neighborhood="Centro",
            city="Bogotá",
            phone="1",
            latitude=4.6,
            longitude=-74.1,
        )
    )
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()
