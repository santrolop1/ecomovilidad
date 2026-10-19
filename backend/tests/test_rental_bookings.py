"""CU-04: solicitar alquiler con disponibilidad real de la flota, pago y gestión."""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.models import ConsentRecord, Rental, RentalUnit, User
from app.services.rentals import price_for

from .conftest import csrf, register

BOGOTA = ZoneInfo("America/Bogota")
CUSTOMER = {
    "fullName": "Ana Pérez",
    "email": "ana@correo.com",
    "phone": "3001234567",
    "documentType": "CC",
    "documentNumber": "1098765432",
}


def weekday_at(hour: int, days_ahead: int = 3, minute: int = 0) -> datetime:
    """Próximo día hábil (lunes a viernes) a esa hora de Bogotá."""
    day = datetime.now(BOGOTA) + timedelta(days=days_ahead)
    while day.weekday() > 4:
        day += timedelta(days=1)
    return day.replace(hour=hour, minute=minute, second=0, microsecond=0)


def offers(client):
    return {o["slug"]: o for o in client.get("/api/v1/rental-offers").json()}


def branch_of(offer, slug="bucaramanga-cabecera"):
    return next(b for b in offer["branches"] if b["branchSlug"] == slug)


def book(client, offer, branch, start, end, expect=201):
    body = {
        "productId": offer["productId"],
        "branchId": branch["branchId"],
        "startAt": start.isoformat(),
        "endAt": end.isoformat(),
        "customer": CUSTOMER,
        "dataConsent": True,
    }
    response = client.post("/api/v1/rentals", json=body, headers=csrf(client))
    assert response.status_code == expect, response.text
    return response.json()


def quote(client, offer, branch, start, end):
    return client.post(
        f"/api/v1/rental-offers/{offer['productId']}/quote",
        json={"branchId": branch["branchId"], "startAt": start.isoformat(), "endAt": end.isoformat()},
    )


# ─── Oferta y precio ────────────────────────────────────────────────────────


def test_oferta_con_tarifas_y_unidades_reales(client):
    data = offers(client)
    bici = data["voltra-urbana-e1"]
    assert {r["unit"]: r["price"] for r in bici["rates"]} == {"hora": 15000, "dia": 65000}
    assert branch_of(bici)["units"] == 3
    assert {b["branchSlug"] for b in data["nimbo-explorer-4k"]["branches"]} == {
        "bucaramanga-cabecera",
        "floridablanca-canaveral",
        "piedecuesta-centro",
    }
    assert "aeroandes-pro-6k" not in data  # sin tarifa: no se alquila


def test_precio_elige_la_opcion_mas_barata():
    start = datetime(2026, 11, 2, 10, tzinfo=UTC)
    rates = {"hora": 15000, "dia": 65000}
    assert price_for(rates, start, start + timedelta(hours=3)) == (45000, 3, "hora")
    assert price_for(rates, start, start + timedelta(hours=6)) == (65000, 6, "dia")  # 6 h por hora = 90.000
    assert price_for(rates, start, start + timedelta(hours=30)) == (130000, 30, "dia")
    assert price_for({"dia": 180000}, start, start + timedelta(hours=2)) == (180000, 2, "dia")


def test_cotizacion_y_validaciones_de_horario(client):
    bici = offers(client)["voltra-urbana-e1"]
    branch = branch_of(bici)
    start = weekday_at(10)
    ok = quote(client, bici, branch, start, start + timedelta(hours=3))
    assert ok.status_code == 200 and ok.json() == {"price": 45000, "hours": 3, "pricing": "hora", "availableUnits": 3}

    def error(s, e):
        response = quote(client, bici, branch, s, e)
        assert response.status_code == 400, response.text
        return response.json()["detail"]

    assert "atiende" in error(weekday_at(7), weekday_at(9))  # antes de abrir
    assert "atiende" in error(start, start.replace(hour=21))  # devolución después de cerrar
    assert "30 minutos" in error(datetime.now(BOGOTA).replace(second=0, microsecond=0, minute=0), start)
    assert "en punto" in error(start.replace(minute=15), start + timedelta(hours=2))
    assert "mínimo" in error(start, start + timedelta(minutes=30))
    assert "máximo" in error(start, start + timedelta(days=15))


# ─── Reservar ───────────────────────────────────────────────────────────────


def test_reserva_aparta_una_unidad_y_guarda_consentimiento(auth_client, db):
    bici = offers(auth_client)["voltra-urbana-e1"]
    branch = branch_of(bici)
    start = weekday_at(10)
    rental = book(auth_client, bici, branch, start, start + timedelta(hours=3))
    assert rental["status"] == "pending" and rental["price"] == 45000
    assert rental["unitCode"].startswith("VUE-CAB-") and rental["paymentExpiresAt"]
    assert quote(auth_client, bici, branch, start, start + timedelta(hours=1)).json()["availableUnits"] == 2
    consent = db.scalars(select(ConsentRecord).where(ConsentRecord.rental_id == rental["id"])).one()
    assert consent.purpose == "alquiler"
    mine = auth_client.get("/api/v1/rentals").json()
    assert [r["id"] for r in mine] == [rental["id"]]


def test_sin_unidades_libres_se_rechaza_pero_otro_horario_si(auth_client):
    dron = offers(auth_client)["nimbo-explorer-4k"]
    branch = branch_of(dron)  # una sola unidad
    start = weekday_at(10)
    book(auth_client, dron, branch, start, start + timedelta(hours=4))
    overlap = book(auth_client, dron, branch, start + timedelta(hours=2), start + timedelta(hours=6), expect=409)
    assert "No hay unidades libres" in overlap["detail"]
    # Justo cuando termina el anterior: periodo semiabierto [inicio, fin).
    book(auth_client, dron, branch, start + timedelta(hours=4), start + timedelta(hours=7))


def test_la_base_impide_alquileres_cruzados_en_la_misma_unidad(auth_client, db):
    user = db.scalars(select(User).where(User.email == "ana@correo.com")).one()
    unit = db.scalars(select(RentalUnit).where(RentalUnit.code == "NE4-CAB-01")).unique().one()
    start = weekday_at(10).astimezone(UTC)

    def insert(s, e):
        db.add(
            Rental(
                user_id=user.id,
                product_id=unit.product_id,
                branch_id=unit.branch_id,
                rental_unit_id=unit.id,
                start_at=s,
                end_at=e,
                status="confirmed",
                price=1,
            )
        )
        db.flush()

    insert(start, start + timedelta(hours=3))
    with pytest.raises(IntegrityError, match="rentals_no_overlap"):
        insert(start + timedelta(hours=1), start + timedelta(hours=2))
    db.rollback()


def test_alquiler_ajeno_es_404(auth_client):
    bici = offers(auth_client)["voltra-urbana-e1"]
    start = weekday_at(10)
    rental = book(auth_client, bici, branch_of(bici), start, start + timedelta(hours=2))
    auth_client.cookies.clear()
    register(auth_client, email="otra@correo.com")
    assert auth_client.get(f"/api/v1/rentals/{rental['id']}").status_code == 404
    pay = auth_client.post("/api/v1/payments", json={"rentalId": rental["id"]}, headers=csrf(auth_client))
    assert pay.status_code == 404


# ─── Pago, vencimiento y panel ──────────────────────────────────────────────


def test_pagar_confirma_y_el_panel_entrega_y_recibe(admin_client, gateway):
    bici = offers(admin_client)["voltra-urbana-e1"]
    start = weekday_at(10)
    rental = book(admin_client, bici, branch_of(bici), start, start + timedelta(hours=3))
    payment = admin_client.post("/api/v1/payments", json={"rentalId": rental["id"]}, headers=csrf(admin_client)).json()
    tx = gateway.approve(payment["reference"], 45000 * 100)
    result = admin_client.post("/api/v1/payments/verify", json={"transactionId": tx.id}, headers=csrf(admin_client))
    assert result.json()["target"] == "alquiler" and result.json()["invoice"]["number"].startswith("EMV-")

    detail = admin_client.get(f"/api/v1/rentals/{rental['id']}").json()
    assert detail["status"] == "confirmed" and detail["payment"]["status"] == "approved" and detail["invoice"]

    url = f"/api/v1/admin/rentals/{rental['id']}"
    assert admin_client.patch(url, json={"status": "cancelled"}, headers=csrf(admin_client)).status_code == 409
    assert admin_client.patch(url, json={"status": "active"}, headers=csrf(admin_client)).json()["status"] == "active"
    done = admin_client.patch(url, json={"status": "completed"}, headers=csrf(admin_client)).json()
    assert done["status"] == "completed" and done["allowedTransitions"] == []
    assert done["unitCode"] == rental["unitCode"]


def test_alquiler_sin_pagar_vence_y_libera_la_unidad(auth_client, db):
    dron = offers(auth_client)["nimbo-explorer-4k"]
    branch = branch_of(dron)
    start = weekday_at(10)
    rental = book(auth_client, dron, branch, start, start + timedelta(hours=4))
    assert quote(auth_client, dron, branch, start, start + timedelta(hours=1)).json()["availableUnits"] == 0
    expired = datetime.now(UTC) - timedelta(hours=1)
    db.execute(update(Rental).where(Rental.id == rental["id"]).values(payment_expires_at=expired))
    db.commit()
    assert auth_client.get(f"/api/v1/rentals/{rental['id']}").json()["status"] == "cancelled"
    assert quote(auth_client, dron, branch, start, start + timedelta(hours=1)).json()["availableUnits"] == 1


def test_unidades_en_mantenimiento_salen_de_la_oferta(admin_client):
    units = admin_client.get("/api/v1/admin/rental-units").json()
    dron = next(u for u in units if u["code"] == "NE4-PIE-01")
    url = f"/api/v1/admin/rental-units/{dron['id']}"
    response = admin_client.patch(url, json={"status": "mantenimiento"}, headers=csrf(admin_client))
    assert response.status_code == 200 and response.json()["status"] == "mantenimiento"
    branches = {b["branchSlug"] for b in offers(admin_client)["nimbo-explorer-4k"]["branches"]}
    assert "piedecuesta-centro" not in branches

    # Con un alquiler vigente, la unidad no se puede retirar.
    bici_units = [u for u in units if u["code"].startswith("VUE-GIR-")]
    bici = offers(admin_client)["voltra-urbana-e1"]
    start = weekday_at(10)
    for _ in bici_units:
        book(admin_client, bici, branch_of(bici, "giron-centro"), start, start + timedelta(hours=2))
    busy = admin_client.patch(
        f"/api/v1/admin/rental-units/{bici_units[0]['id']}", json={"status": "retirado"}, headers=csrf(admin_client)
    )
    assert busy.status_code == 409


def test_el_panel_solo_lo_ve_un_administrador(auth_client):
    assert auth_client.get("/api/v1/admin/rental-units").status_code == 403
