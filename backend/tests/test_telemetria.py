"""CU-10 y CU-11: posiciones GPS por API, zonas permitidas y asignación del más cercano."""

import uuid
from datetime import timedelta

from app.models import GpsDevice
from app.modules.inventario.reservations import now_utc

from .conftest import csrf, register
from .test_admin import A
from .test_domicilios import D, courier, delivery_id, paid_delivery

P = "/api/v1/telemetry/positions"
INSIDE = {"latitude": 7.1193, "longitude": -73.1227, "batteryPct": 80}
OUTSIDE = {"latitude": 4.6097, "longitude": -74.0817}


def new_device(client, code="DOM-01", kind="domicilio", **extra):
    response = client.post(f"{A}/gps-devices", json={"code": code, "kind": kind, **extra}, headers=csrf(client))
    assert response.status_code == 201, response.text
    return response.json()


def report(client, db, device, position):
    """Envía una posición dejando pasar el intervalo mínimo entre reportes."""
    row = db.get(GpsDevice, uuid.UUID(device["id"]))
    if row.last_seen_at:
        row.last_seen_at = now_utc() - timedelta(seconds=5)
        db.flush()
    return client.post(P, json=position, headers={"Authorization": f"Bearer {device['token']}"})


def test_token_solo_se_muestra_al_crear_y_se_guarda_su_hash(admin_client, db):
    device = new_device(admin_client)
    assert len(device["token"]) > 30
    row = db.get(GpsDevice, uuid.UUID(device["id"]))
    assert row.token_hash != device["token"] and device["token"] not in row.token_hash
    listed = admin_client.get(f"{A}/gps-devices").json()
    assert listed[0]["code"] == "DOM-01" and "token" not in listed[0] and "tokenHash" not in listed[0]


def test_sin_token_valido_no_se_reciben_posiciones(admin_client, client, db):
    device = new_device(admin_client)
    assert client.post(P, json=INSIDE).status_code == 401
    assert client.post(P, json=INSIDE, headers={"Authorization": "Bearer inventado"}).status_code == 401
    assert client.post(P, json=INSIDE, headers={"Authorization": device["token"]}).status_code == 401
    # La sesión de un administrador tampoco sirve para reportar.
    assert admin_client.post(P, json=INSIDE, headers=csrf(admin_client)).status_code == 401
    admin_client.patch(f"{A}/gps-devices/{device['id']}", json={"isActive": False}, headers=csrf(admin_client))
    assert report(client, db, device, INSIDE).status_code == 401


def test_coordenadas_absurdas_y_exceso_de_reportes(admin_client, client, db):
    device = new_device(admin_client)
    headers = {"Authorization": f"Bearer {device['token']}"}
    assert client.post(P, json={"latitude": 95, "longitude": -73.1}, headers=headers).status_code == 422
    assert client.post(P, json={"latitude": 7.1, "longitude": 10}, headers=headers).status_code == 422
    assert client.post(P, json={**INSIDE, "batteryPct": 140}, headers=headers).status_code == 422
    assert client.post(P, json=INSIDE, headers=headers).status_code == 201
    assert client.post(P, json=INSIDE, headers=headers).status_code == 429


def test_la_flota_muestra_posicion_recorrido_y_estado(admin_client, db):
    assert admin_client.get(f"{A}/telemetry/fleet").json()["assets"] == []
    device = new_device(admin_client)
    assert admin_client.get(f"{A}/telemetry/fleet").json()["activeDevices"] == 1
    assert report(admin_client, db, device, INSIDE).status_code == 201
    second = {**INSIDE, "latitude": 7.1200}
    assert report(admin_client, db, device, second).status_code == 201

    fleet = admin_client.get(f"{A}/telemetry/fleet").json()
    asset = fleet["assets"][0]
    assert asset["code"] == "DOM-01" and asset["status"] == "disponible" and asset["stale"] is False
    assert asset["position"] == {"lat": 7.12, "lng": -73.1227}
    assert asset["batteryPct"] == 80 and len(asset["trail"]) == 1
    assert fleet["zones"][0]["name"] == "Área metropolitana de Bucaramanga"


def test_salir_de_la_zona_abre_una_alerta_y_volver_la_cierra(admin_client, db):
    device = new_device(admin_client)
    assert report(admin_client, db, device, OUTSIDE).json()["outsideZone"] is True
    assert report(admin_client, db, device, OUTSIDE).status_code == 201  # no abre otra

    fleet = admin_client.get(f"{A}/telemetry/fleet").json()
    assert fleet["openAlerts"] == 1 and fleet["assets"][0]["status"] == "incidencia"
    alerts = admin_client.get(f"{A}/geofence-alerts", params={"only_open": True}).json()
    assert [a["deviceCode"] for a in alerts] == ["DOM-01"]

    assert report(admin_client, db, device, INSIDE).json()["outsideZone"] is False
    assert admin_client.get(f"{A}/telemetry/fleet").json()["openAlerts"] == 0
    history = admin_client.get(f"{A}/geofence-alerts").json()
    assert len(history) == 1 and history[0]["closedAt"]


def test_una_zona_nueva_permite_el_lugar_y_sin_zonas_no_hay_alertas(admin_client, db):
    bogota = {"name": "Bogotá", "latitude": 4.6097, "longitude": -74.0817, "radiusM": 5000}
    created = admin_client.post(f"{A}/geofences", json=bogota, headers=csrf(admin_client))
    assert created.status_code == 201
    assert admin_client.post(f"{A}/geofences", json=bogota, headers=csrf(admin_client)).status_code == 409
    assert (
        admin_client.post(
            f"{A}/geofences", json={**bogota, "name": "Mala", "radiusM": 1}, headers=csrf(admin_client)
        ).status_code
        == 422
    )
    device = new_device(admin_client)
    assert report(admin_client, db, device, OUTSIDE).json()["outsideZone"] is False

    for zone in admin_client.get(f"{A}/geofences").json():
        admin_client.patch(f"{A}/geofences/{zone['id']}", json={"isActive": False}, headers=csrf(admin_client))
    other = {"latitude": 10.39, "longitude": -75.51}
    assert report(admin_client, db, device, other).json()["outsideZone"] is False


def test_asigna_al_mas_cercano_con_gps_reciente(admin_client, gateway, db):
    order = paid_delivery(admin_client, gateway)
    did = delivery_id(admin_client, order)
    url = f"{D}/{did}/assign-nearest"
    assert admin_client.post(url, headers=csrf(admin_client)).status_code == 409  # nadie con GPS

    near, far, stale = (
        courier(admin_client, "Cercano Uno"),
        courier(admin_client, "Lejano Dos"),
        courier(admin_client, "Viejo Tres"),
    )
    branch = admin_client.get(f"{A}/orders/{order['id']}").json()["branchId"]
    hub = next(b for b in admin_client.get(f"{A}/branches").json() if b["id"] == branch)
    for code, who, position in (
        ("D-NEAR", near, {"latitude": hub["latitude"] + 0.001, "longitude": hub["longitude"]}),
        ("D-FAR", far, {"latitude": hub["latitude"] + 0.1, "longitude": hub["longitude"]}),
        ("D-OLD", stale, {"latitude": hub["latitude"], "longitude": hub["longitude"]}),
    ):
        device = new_device(admin_client, code=code, courierId=who["id"])
        assert report(admin_client, db, device, position).status_code == 201
        if code == "D-OLD":
            db.get(GpsDevice, uuid.UUID(device["id"])).last_seen_at = now_utc() - timedelta(hours=1)
            db.flush()

    assigned = admin_client.post(url, headers=csrf(admin_client))
    assert assigned.status_code == 200, assigned.text
    assert assigned.json()["courierName"] == "Cercano Uno"


def test_el_enlace_publico_solo_muestra_al_domiciliario_en_transito(admin_client, gateway, client, db):
    order = paid_delivery(admin_client, gateway)
    did = delivery_id(admin_client, order)
    token = order["delivery"]["trackingToken"]
    who = courier(admin_client, "Marta Ruiz")
    device = new_device(admin_client, courierId=who["id"])
    report(admin_client, db, device, INSIDE)
    admin_client.post(f"{D}/{did}/assign", json={"courierId": who["id"]}, headers=csrf(admin_client))
    assert "position" not in client.get(f"/api/v1/tracking/{token}").json()

    for state in ("en_recogida", "en_transito"):
        admin_client.patch(f"{D}/{did}", json={"status": state}, headers=csrf(admin_client))
    position = client.get(f"/api/v1/tracking/{token}").json()["position"]
    assert position["lat"] == INSIDE["latitude"] and position["lng"] == INSIDE["longitude"]

    code = order["delivery"]["confirmationCode"]
    admin_client.post(f"{D}/{did}/validate", json={"method": "qr", "code": code}, headers=csrf(admin_client))
    assert "position" not in client.get(f"/api/v1/tracking/{token}").json()


def test_un_dispositivo_no_va_en_dos_duenos_ni_repite_codigo(admin_client):
    new_device(admin_client, code="UNICO")
    body = {"code": "unico", "kind": "dron"}
    assert admin_client.post(f"{A}/gps-devices", json=body, headers=csrf(admin_client)).status_code == 409
    both = {"code": "DOS", "kind": "dron", "courierId": str(uuid.uuid4()), "rentalUnitId": str(uuid.uuid4())}
    assert admin_client.post(f"{A}/gps-devices", json=both, headers=csrf(admin_client)).status_code >= 400


def test_solo_administradores_gestionan_telemetria(client):
    register(client, email="sin-permisos@correo.com")
    for path in ("telemetry/fleet", "gps-devices", "geofences", "geofence-alerts"):
        assert client.get(f"{A}/{path}").status_code == 403
