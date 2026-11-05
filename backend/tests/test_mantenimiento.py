"""CU-12: uso, umbrales, bloqueo automático al 90 % y bitácora inmutable."""

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from .conftest import csrf, register
from .test_admin import A
from .test_rental_bookings import branch_of, offers

U = f"{A}/rental-units"


def unit_of(client, slug="nimbo-explorer-4k"):
    """Una unidad operativa del vehículo y su sucursal."""
    offer = offers(client)[slug]
    branch = branch_of(offer)
    units = client.get(U).json()
    return next(u for u in units if u["productId"] == offer["productId"] and u["status"] == "operativo"), branch


def units_in_service(offer):
    return sum(b["units"] for b in offer["branches"]) if offer else 0


def add_usage(client, unit, amount, note=None):
    return client.post(f"{U}/{unit['id']}/usage", json={"amount": amount, "note": note}, headers=csrf(client))


def test_drones_se_miden_en_horas_y_lo_demas_en_km(admin_client):
    units = admin_client.get(U).json()
    assert {u["usageUnit"] for u in units} == {"km", "horas"}
    assert all(u["usageValue"] == 0 and u["serviceAlert"] == "ok" for u in units)
    horas = next(u for u in units if u["usageUnit"] == "horas")
    km = next(u for u in units if u["usageUnit"] == "km")
    assert horas["serviceThreshold"] == 50 and km["serviceThreshold"] == 500


def test_avisa_antes_y_bloquea_al_90_por_ciento(admin_client):
    unit, _ = unit_of(admin_client)
    threshold = unit["serviceThreshold"]
    warned = add_usage(admin_client, unit, threshold * 0.8).json()
    assert warned["serviceAlert"] == "proximo" and warned["usagePercent"] == 80 and warned["status"] == "operativo"

    blocked = add_usage(admin_client, unit, threshold * 0.1, "Vuelo largo").json()
    assert (
        blocked["status"] == "mantenimiento"
        and blocked["serviceAlert"] == "bloqueado"
        and blocked["usagePercent"] == 90
    )

    kinds = [e["kind"] for e in admin_client.get(f"{U}/{unit['id']}/maintenance-log").json()]
    assert sorted(kinds) == ["bloqueo", "uso", "uso"]


def test_una_unidad_bloqueada_sale_de_la_oferta(admin_client):
    before = offers(admin_client)["nimbo-explorer-4k"]
    unit, _ = unit_of(admin_client)
    add_usage(admin_client, unit, unit["serviceThreshold"])
    after = offers(admin_client).get("nimbo-explorer-4k")
    assert units_in_service(after) == units_in_service(before) - 1


def test_no_vuelve_a_operar_sin_registrar_el_mantenimiento(admin_client):
    unit, _ = unit_of(admin_client)
    url = f"{U}/{unit['id']}"
    add_usage(admin_client, unit, unit["serviceThreshold"])
    response = admin_client.patch(url, json={"status": "operativo"}, headers=csrf(admin_client))
    assert response.status_code == 409 and "mantenimiento" in response.json()["detail"]

    finish = f"{url}/maintenance/finish"
    assert admin_client.post(finish, json={"note": "x"}, headers=csrf(admin_client)).status_code == 422
    done = admin_client.post(finish, json={"note": "Cambio de hélices"}, headers=csrf(admin_client))
    assert done.status_code == 200
    assert done.json()["status"] == "operativo" and done.json()["usageValue"] == 0
    entry = next(e for e in admin_client.get(f"{url}/maintenance-log").json() if e["kind"] == "fin")
    assert entry["note"] == "Cambio de hélices" and entry["userName"]
    assert admin_client.post(finish, json={"note": "Otra vez"}, headers=csrf(admin_client)).status_code == 409


def test_bajar_el_umbral_tambien_bloquea(admin_client):
    unit, _ = unit_of(admin_client)
    url = f"{U}/{unit['id']}"
    add_usage(admin_client, unit, 10)
    updated = admin_client.put(f"{url}/threshold", json={"serviceThreshold": 11}, headers=csrf(admin_client)).json()
    assert updated["serviceThreshold"] == 11 and updated["status"] == "mantenimiento"
    assert (
        admin_client.put(f"{url}/threshold", json={"serviceThreshold": 0}, headers=csrf(admin_client)).status_code
        == 422
    )


def test_cambios_manuales_quedan_en_la_bitacora(admin_client):
    unit, _ = unit_of(admin_client)
    url = f"{U}/{unit['id']}"
    admin_client.patch(url, json={"status": "mantenimiento"}, headers=csrf(admin_client))
    admin_client.patch(url, json={"status": "operativo"}, headers=csrf(admin_client))
    kinds = {e["kind"] for e in admin_client.get(f"{url}/maintenance-log").json()}
    assert kinds == {"inicio", "fin"}


def test_la_bitacora_no_se_puede_editar_ni_borrar(admin_client, db):
    unit, _ = unit_of(admin_client)
    add_usage(admin_client, unit, 1)
    for statement in ("UPDATE maintenance_logs SET note = 'alterada'", "DELETE FROM maintenance_logs"):
        with pytest.raises(DBAPIError, match="no se puede modificar"), db.begin_nested():
            db.execute(text(statement))


def test_uso_invalido_y_solo_administradores(admin_client, client):
    unit, _ = unit_of(admin_client)
    assert add_usage(admin_client, unit, 0).status_code == 422
    assert add_usage(admin_client, unit, -5).status_code == 422
    fake = "00000000-0000-0000-0000-000000000000"
    assert admin_client.get(f"{U}/{fake}").status_code == 404
    admin_client.cookies.clear()
    register(client, email="sin-taller@correo.com")
    assert client.post(f"{U}/{unit['id']}/usage", json={"amount": 1}, headers=csrf(client)).status_code == 403
    assert client.get(f"{U}/{unit['id']}/maintenance-log").status_code == 403
