"""Mantenimiento por tiempo: cada unidad se revisa cada cierto número de días."""

import uuid
from datetime import timedelta

from app.models import RentalUnit
from app.modules.inventario.reservations import now_utc

from .conftest import csrf
from .test_admin import A
from .test_mantenimiento import unit_of, units_in_service
from .test_rental_bookings import offers

U = f"{A}/rental-units"


def age(db, unit, days):
    row = db.get(RentalUnit, uuid.UUID(unit["id"]))
    row.last_service_at = now_utc() - timedelta(days=days)
    db.flush()


def test_cada_unidad_tiene_su_proxima_revision(admin_client):
    units = admin_client.get(U).json()
    drone = next(u for u in units if u["usageUnit"] == "horas")
    bike = next(u for u in units if u["usageUnit"] == "km")
    assert drone["serviceIntervalDays"] == 60 and bike["serviceIntervalDays"] == 90
    assert bike["daysToService"] in (89, 90) and bike["nextServiceAt"] and bike["serviceReason"] is None
    assert all(u["availability"] == "disponible" for u in units)


def test_avisa_una_semana_antes(admin_client, db):
    unit, _ = unit_of(admin_client)
    age(db, unit, unit["serviceIntervalDays"] - 5)
    warned = admin_client.get(f"{U}/{unit['id']}").json()
    assert warned["serviceAlert"] == "proximo" and warned["daysToService"] in (4, 5)
    assert "Revisión periódica" in warned["serviceReason"]


def test_vencida_sale_de_la_oferta_y_no_vuelve_sin_mantenimiento(admin_client, db):
    before = offers(admin_client)["nimbo-explorer-4k"]
    unit, _ = unit_of(admin_client)
    age(db, unit, unit["serviceIntervalDays"] + 1)

    due = admin_client.get(f"{U}/{unit['id']}").json()
    assert due["serviceAlert"] == "bloqueado" and due["availability"] == "mantenimiento"
    assert due["serviceReason"] == "Venció la revisión periódica."
    assert units_in_service(offers(admin_client).get("nimbo-explorer-4k")) == units_in_service(before) - 1

    url = f"{U}/{unit['id']}"
    admin_client.patch(url, json={"status": "mantenimiento"}, headers=csrf(admin_client))
    refused = admin_client.patch(url, json={"status": "operativo"}, headers=csrf(admin_client))
    assert refused.status_code == 409 and "revisión periódica" in refused.json()["detail"]

    done = admin_client.post(
        f"{url}/maintenance/finish", json={"note": "Revisión de 60 días"}, headers=csrf(admin_client)
    )
    assert done.status_code == 200
    assert done.json()["availability"] == "disponible" and done.json()["daysToService"] >= 59


def test_cambiar_el_plazo_queda_en_la_bitacora_y_puede_bloquear(admin_client, db):
    unit, _ = unit_of(admin_client)
    url = f"{U}/{unit['id']}"
    age(db, unit, 20)
    assert (
        admin_client.put(f"{url}/interval", json={"serviceIntervalDays": 0}, headers=csrf(admin_client)).status_code
        == 422
    )
    updated = admin_client.put(f"{url}/interval", json={"serviceIntervalDays": 15}, headers=csrf(admin_client))
    assert updated.status_code == 200
    assert updated.json()["serviceIntervalDays"] == 15 and updated.json()["status"] == "mantenimiento"
    notes = [e["note"] for e in admin_client.get(f"{url}/maintenance-log").json()]
    assert "Revisión periódica cada 15 días" in notes
    assert any(n and "Venció la revisión periódica" in n for n in notes)
