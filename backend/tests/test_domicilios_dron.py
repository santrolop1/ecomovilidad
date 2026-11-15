"""Domicilios con dron: cómo se sabe que el paquete se entregó.

El GPS del dron prueba que liberó el paquete cerca del punto de entrega y el
cliente lo confirma desde su cuenta. Si no confirma ni reclama a tiempo, el
panel cierra con la evidencia del dron.
"""

import uuid
from datetime import timedelta

from app.models import Delivery, GpsDevice
from app.modules.inventario.reservations import now_utc

from .conftest import csrf
from .test_admin import A
from .test_domicilios import PNG, D, courier, delivery_id, move, paid_delivery, validate
from .test_telemetria import OUTSIDE, new_device, report

DROPS = "/api/v1/telemetry/drops"
DEST = {"latitude": 7.1193, "longitude": -73.1227}
# ~20 m al norte del destino: dentro del radio de entrega.
NEAR = {"latitude": 7.11948, "longitude": -73.1227}
# ~550 m del destino: demasiado lejos para soltar el paquete.
FAR = {"latitude": 7.1243, "longitude": -73.1227}


def drone(client, code="DRN-DOM-01"):
    return new_device(client, code=code, kind="dron")


def assign_drone(client, did, device, destination=DEST):
    body = {
        "droneDeviceId": device["id"],
        "destinationLatitude": destination["latitude"],
        "destinationLongitude": destination["longitude"],
    }
    return client.post(f"{D}/{did}/assign-drone", json=body, headers=csrf(client))


def drone_in_transit(client, gateway):
    order = paid_delivery(client, gateway)
    did = delivery_id(client, order)
    device = drone(client)
    assigned = assign_drone(client, did, device)
    assert assigned.status_code == 200, assigned.text
    assert move(client, did, "en_recogida").status_code == 200
    assert move(client, did, "en_transito").status_code == 200
    return order, did, device


def drop(client, device, position):
    return client.post(DROPS, json=position, headers={"Authorization": f"Bearer {device['token']}"})


def test_solo_drones_de_domicilios_dentro_de_las_zonas(admin_client, gateway):
    order = paid_delivery(admin_client, gateway)
    did = delivery_id(admin_client, order)
    device = drone(admin_client)
    listed = admin_client.get(f"{A}/delivery-drones").json()
    assert [d["code"] for d in listed] == ["DRN-DOM-01"]

    # Un dispositivo de domiciliario no es un dron, y el destino debe estar en una zona permitida.
    assert assign_drone(admin_client, did, new_device(admin_client, code="DOM-09")).status_code == 409
    assert assign_drone(admin_client, did, device, OUTSIDE).status_code == 409

    body = assign_drone(admin_client, did, device).json()
    assert body["carrier"] == "dron" and body["courierName"] == "Dron DRN-DOM-01"
    assert body["courierId"] is None and body["droneDeviceId"] == device["id"]
    assert body["destinationLatitude"] == DEST["latitude"]

    # El mismo dron no lleva dos domicilios a la vez.
    other = delivery_id(admin_client, paid_delivery(admin_client, gateway))
    assert assign_drone(admin_client, other, device).status_code == 409

    # Volver a un domiciliario quita el dron.
    who = courier(admin_client)
    back = admin_client.post(f"{D}/{did}/assign", json={"courierId": who["id"]}, headers=csrf(admin_client)).json()
    assert back["carrier"] == "domiciliario" and back["droneDeviceId"] is None


def test_el_dron_solo_libera_el_paquete_sobre_el_punto_de_entrega(admin_client, gateway, db):
    order, did, device = drone_in_transit(admin_client, gateway)
    detail = admin_client.get(f"{D}/{did}").json()
    assert detail["canRecordDrop"] is True and detail["canValidate"] is False

    # Sin liberar el paquete no se valida, ni siquiera con el código.
    code = order["delivery"]["confirmationCode"]
    assert validate(admin_client, did, method="qr", code=code).status_code == 409

    far = drop(admin_client, device, FAR)
    assert far.status_code == 409 and "m del punto de entrega" in far.json()["detail"]
    assert drop(admin_client, new_device(admin_client, code="DRN-SIN-ENCARGO", kind="dron"), NEAR).status_code == 409
    assert admin_client.post(DROPS, json=NEAR).status_code == 401

    ok = drop(admin_client, device, NEAR)
    assert ok.status_code == 201, ok.text
    assert ok.json()["distanceM"] <= 50

    detail = admin_client.get(f"{D}/{did}").json()
    assert detail["status"] == "en_transito" and detail["droppedAt"] and detail["dropDistanceM"] <= 50
    assert detail["canRecordDrop"] is False and detail["canValidate"] is True
    assert detail["canCloseWithDroneEvidence"] is False
    assert detail["events"][-1]["note"].startswith("Paquete liberado a")
    assert drop(admin_client, device, NEAR).status_code == 409  # una sola vez


def test_el_cliente_confirma_que_recibio_y_el_pedido_se_completa(admin_client, gateway):
    order, did, device = drone_in_transit(admin_client, gateway)
    url = f"/api/v1/orders/{order['id']}/delivery/confirm"
    assert admin_client.post(url, headers=csrf(admin_client)).status_code == 409  # aún no ha soltado nada

    drop(admin_client, device, NEAR)
    mine = admin_client.get(f"/api/v1/orders/{order['id']}").json()["delivery"]
    assert mine["carrier"] == "dron" and mine["canConfirmReceipt"] is True and mine["droppedAt"]

    done = admin_client.post(url, headers=csrf(admin_client))
    assert done.status_code == 200, done.text
    assert done.json()["status"] == "completed"
    assert done.json()["delivery"]["status"] == "entregado"

    detail = admin_client.get(f"{D}/{did}").json()
    assert detail["proofMethod"] == "dron" and detail["customerConfirmedAt"]
    assert admin_client.post(url, headers=csrf(admin_client)).status_code == 409


def test_firma_no_aplica_y_la_evidencia_del_dron_espera_el_plazo(admin_client, gateway, db):
    _, did, device = drone_in_transit(admin_client, gateway)
    drop(admin_client, device, NEAR)
    signed = validate(admin_client, did, method="firma", signerName="Ana Pérez", signatureImage=PNG)
    assert signed.status_code == 409
    assert validate(admin_client, did, method="dron").status_code == 409  # todavía en el plazo

    db.get(Delivery, uuid.UUID(did)).dropped_at = now_utc() - timedelta(minutes=31)
    db.flush()
    assert admin_client.get(f"{D}/{did}").json()["canCloseWithDroneEvidence"] is True
    closed = validate(admin_client, did, method="dron")
    assert closed.status_code == 200, closed.text
    assert closed.json()["proofMethod"] == "dron" and closed.json()["customerConfirmedAt"] is None


def test_el_panel_registra_la_liberacion_con_gps_reciente(admin_client, gateway, db):
    _, did, device = drone_in_transit(admin_client, gateway)
    url = f"{D}/{did}/drop"
    assert admin_client.post(url, headers=csrf(admin_client)).status_code == 409  # sin GPS

    assert report(admin_client, db, device, FAR).status_code == 201
    assert admin_client.post(url, headers=csrf(admin_client)).status_code == 409  # lejos

    assert report(admin_client, db, device, NEAR).status_code == 201
    row = db.get(GpsDevice, uuid.UUID(device["id"]))
    row.last_seen_at = now_utc() - timedelta(minutes=5)
    db.flush()
    assert admin_client.post(url, headers=csrf(admin_client)).status_code == 409  # posición vieja

    row.last_seen_at = now_utc()
    db.flush()
    recorded = admin_client.post(url, headers=csrf(admin_client))
    assert recorded.status_code == 200 and recorded.json()["droppedAt"]


def test_un_domiciliario_no_cierra_con_evidencia_de_dron(admin_client, gateway):
    order = paid_delivery(admin_client, gateway)
    did = delivery_id(admin_client, order)
    who = courier(admin_client)
    admin_client.post(f"{D}/{did}/assign", json={"courierId": who["id"]}, headers=csrf(admin_client))
    move(admin_client, did, "en_recogida")
    move(admin_client, did, "en_transito")
    assert validate(admin_client, did, method="dron").status_code == 409
    assert admin_client.post(f"{D}/{did}/drop", headers=csrf(admin_client)).status_code == 409


def test_seguimiento_y_operacion_muestran_al_dron(admin_client, gateway, client, db):
    order, did, device = drone_in_transit(admin_client, gateway)
    report(admin_client, db, device, FAR)

    fleet = admin_client.get(f"{A}/telemetry/fleet").json()
    asset = next(a for a in fleet["assets"] if a["code"] == "DRN-DOM-01")
    assert asset["status"] == "en_uso" and asset["deliveryId"] == did
    assert asset["activity"].startswith("Llevando un domicilio")
    assert asset["destination"] == {"lat": DEST["latitude"], "lng": DEST["longitude"]}

    token = order["delivery"]["trackingToken"]
    public = client.get(f"/api/v1/tracking/{token}").json()
    assert public["carrier"] == "dron" and public["position"]["lat"] == FAR["latitude"]


def test_reprogramar_borra_el_dron_y_la_liberacion(admin_client, gateway):
    _, did, device = drone_in_transit(admin_client, gateway)
    drop(admin_client, device, NEAR)
    assert move(admin_client, did, "fallido", "El cliente no estaba en casa").status_code == 200
    again = move(admin_client, did, "creado", "Nueva franja")
    assert again.status_code == 200
    body = again.json()
    assert body["carrier"] == "domiciliario" and body["droneDeviceId"] is None
    assert body["droppedAt"] is None and body["canAssign"] is True
    # El dron queda libre para otro domicilio.
    assert assign_drone(admin_client, did, device).status_code == 200
