"""La sucursal registra la salida y la entrada del vehículo alquilado.

Mientras está afuera con el cliente, la unidad aparece como no disponible.
Al recibirla se anota el uso, que puede mandarla a mantenimiento.
"""

from datetime import timedelta

from .conftest import csrf
from .test_admin import A
from .test_refunds import pay
from .test_rental_bookings import book, branch_of, offers, weekday_at

R = f"{A}/rentals"
U = f"{A}/rental-units"


def paid_rental(client, gateway, slug="voltra-urbana-e1", branch="bucaramanga-cabecera", hours=3):
    offer = offers(client)[slug]
    start = weekday_at(10)
    rental = book(client, offer, branch_of(offer, branch), start, start + timedelta(hours=hours))
    pay(client, gateway, rentalId=rental["id"])
    return rental


def unit_by_code(client, code):
    return next(u for u in client.get(U).json() if u["code"] == code)


def units_at(client, slug, branch):
    offer = offers(client).get(slug)
    found = next((b for b in offer["branches"] if b["branchSlug"] == branch), None) if offer else None
    return found["units"] if found else 0


def test_registrar_salida_deja_la_unidad_no_disponible(admin_client, gateway):
    before = units_at(admin_client, "voltra-urbana-e1", "bucaramanga-cabecera")
    rental = paid_rental(admin_client, gateway)
    detail = admin_client.get(f"{R}/{rental['id']}").json()
    assert detail["status"] == "confirmed" and detail["canCheckOut"] is True and detail["checkedOutAt"] is None

    out = admin_client.post(f"{R}/{rental['id']}/check-out", json={}, headers=csrf(admin_client))
    assert out.status_code == 200, out.text
    body = out.json()
    assert body["status"] == "active" and body["checkedOutAt"] and body["checkedOutByName"]
    assert body["canCheckIn"] is True and body["canCheckOut"] is False

    unit = unit_by_code(admin_client, rental["unitCode"])
    assert unit["availability"] == "fuera" and unit["currentRentalId"] == rental["id"]
    assert units_at(admin_client, "voltra-urbana-e1", "bucaramanga-cabecera") == before - 1

    # El cliente ve cuándo recogió el vehículo.
    mine = admin_client.get(f"/api/v1/rentals/{rental['id']}").json()
    assert mine["checkedOutAt"]
    # No sale dos veces.
    assert admin_client.post(f"{R}/{rental['id']}/check-out", json={}, headers=csrf(admin_client)).status_code == 409


def test_registrar_entrada_suma_el_uso_y_vuelve_a_estar_disponible(admin_client, gateway):
    before = units_at(admin_client, "voltra-urbana-e1", "bucaramanga-cabecera")
    rental = paid_rental(admin_client, gateway)
    url = f"{R}/{rental['id']}"
    assert admin_client.post(f"{url}/check-in", json={"usage": 5}, headers=csrf(admin_client)).status_code == 409
    admin_client.post(f"{url}/check-out", json={}, headers=csrf(admin_client))
    assert admin_client.post(f"{url}/check-in", json={"usage": -1}, headers=csrf(admin_client)).status_code == 422

    back = admin_client.post(f"{url}/check-in", json={"usage": 12.5, "note": "Sin novedad"}, headers=csrf(admin_client))
    assert back.status_code == 200, back.text
    body = back.json()
    assert body["status"] == "completed" and body["returnedAt"] and body["returnUsage"] == 12.5

    unit = unit_by_code(admin_client, rental["unitCode"])
    assert unit["availability"] == "disponible" and unit["usageValue"] == 12.5
    assert units_at(admin_client, "voltra-urbana-e1", "bucaramanga-cabecera") == before
    log = admin_client.get(f"{U}/{unit['id']}/maintenance-log").json()
    assert log[0]["kind"] == "uso" and "Devolución del alquiler" in log[0]["note"]


def test_mucho_uso_al_devolver_manda_la_unidad_a_mantenimiento(admin_client, gateway):
    rental = paid_rental(admin_client, gateway)
    url = f"{R}/{rental['id']}"
    admin_client.post(f"{url}/check-out", json={}, headers=csrf(admin_client))
    unit = unit_by_code(admin_client, rental["unitCode"])
    admin_client.post(f"{url}/check-in", json={"usage": unit["serviceThreshold"]}, headers=csrf(admin_client))
    after = unit_by_code(admin_client, rental["unitCode"])
    assert after["status"] == "mantenimiento" and after["availability"] == "mantenimiento"


def test_una_unidad_en_taller_no_sale(admin_client, gateway):
    rental = paid_rental(admin_client, gateway)
    unit = unit_by_code(admin_client, rental["unitCode"])
    admin_client.patch(f"{U}/{unit['id']}", json={"status": "retirado"}, headers=csrf(admin_client))
    detail = admin_client.get(f"{R}/{rental['id']}").json()
    # Con un alquiler vigente no se retira: sigue operativa y puede salir.
    assert detail["canCheckOut"] is True

    unit = unit_by_code(admin_client, rental["unitCode"])
    admin_client.post(f"{U}/{unit['id']}/usage", json={"amount": unit["serviceThreshold"]}, headers=csrf(admin_client))
    blocked = admin_client.get(f"{R}/{rental['id']}").json()
    assert blocked["canCheckOut"] is False and "mantenimiento" in blocked["checkOutBlocker"]
    response = admin_client.post(f"{R}/{rental['id']}/check-out", json={}, headers=csrf(admin_client))
    assert response.status_code == 409


def test_el_cambio_de_estado_antiguo_tambien_registra(admin_client, gateway):
    rental = paid_rental(admin_client, gateway)
    url = f"{R}/{rental['id']}"
    active = admin_client.patch(url, json={"status": "active"}, headers=csrf(admin_client)).json()
    assert active["checkedOutAt"]
    done = admin_client.patch(url, json={"status": "completed"}, headers=csrf(admin_client)).json()
    assert done["returnedAt"] and done["returnUsage"] is None


def test_solo_administradores_registran(auth_client):
    fake = "00000000-0000-0000-0000-000000000000"
    assert auth_client.post(f"{R}/{fake}/check-out", json={}, headers=csrf(auth_client)).status_code == 403
