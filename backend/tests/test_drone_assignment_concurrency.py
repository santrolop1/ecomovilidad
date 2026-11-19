"""Un mismo dron no puede ocupar dos domicilios en transacciones independientes."""

import threading
import time
import uuid

from sqlalchemy import delete, func, select, text
from sqlalchemy.orm import Session

from app.core.errors import ConflictError
from app.models import Branch, Delivery, DeliveryEvent, GpsDevice, Order, User
from app.models.enums import AssetKind, DeliveryStatus, FulfillmentMethod, OrderStatus
from app.modules.domicilios import service
from app.modules.domicilios.schemas import AssignDroneIn
from app.modules.inventario.reservations import now_utc


def test_dos_asignaciones_simultaneas_no_comparten_dron(engine):
    tag = uuid.uuid4().hex[:12]
    with Session(engine) as db:
        branch = db.scalars(select(Branch).limit(1)).one()
        user = User(
            email=f"drone-concurrency-{tag}@correo.com",
            password_hash="not-used-by-this-service-test",
            first_name="Prueba",
            last_name="Concurrencia",
            phone="3000000000",
            is_admin=True,
        )
        device = GpsDevice(code=f"DRN-CONC-{tag}", kind=AssetKind.DRONE, token_hash=uuid.uuid4().hex + uuid.uuid4().hex)
        db.add_all([user, device])
        db.flush()
        orders = [
            Order(
                user_id=user.id,
                branch_id=branch.id,
                status=OrderStatus.PAID,
                subtotal=1000,
                shipping_cost=0,
                total=1000,
                fulfillment_method=FulfillmentMethod.DELIVERY,
                delivery_address="Dirección de prueba",
                delivery_city="Bucaramanga",
                scheduled_date=now_utc().date(),
                time_slot="08:00-10:00",
                contact_name="Prueba Concurrencia",
                contact_email=user.email,
                contact_phone=user.phone,
                document_type="CC",
                document_number="123456",
            )
            for _ in range(2)
        ]
        db.add_all(orders)
        db.flush()
        deliveries = [
            Delivery(order_id=order.id, tracking_token=uuid.uuid4().hex, confirmation_code="123456") for order in orders
        ]
        db.add_all(deliveries)
        db.commit()
        user_id, device_id = user.id, device.id
        order_ids, delivery_ids = [order.id for order in orders], [delivery.id for delivery in deliveries]

    data = AssignDroneIn(drone_device_id=device_id, destination_latitude=7.1193, destination_longitude=-73.1227)
    worker_ready = threading.Event()
    worker_pid = []
    results = []
    errors = []

    def competing_assignment():
        try:
            with Session(engine) as db:
                db.execute(text("SET LOCAL lock_timeout = '10s'"))
                worker_pid.append(db.scalar(select(func.pg_backend_pid())))
                worker_ready.set()
                try:
                    service.assign_drone(db, delivery_ids[1], data, user_id)
                    results.append("asignado")
                except ConflictError:
                    db.rollback()
                    results.append("ocupado")
        except Exception as error:
            errors.append(error)
            worker_ready.set()

    worker = threading.Thread(target=competing_assignment, daemon=True)
    try:
        with Session(engine) as first:
            first.scalar(select(GpsDevice).where(GpsDevice.id == device_id).with_for_update())
            worker.start()
            try:
                assert worker_ready.wait(timeout=10), "La segunda conexión no inició"
                assert not errors, errors
                # Esperar un bloqueo real en PostgreSQL, no un retraso arbitrario.
                # Sin serialización, la segunda transacción ya leyó libre el dron
                # y se bloquea tarde al validar su FK; acabaría asignando ambos.
                with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as observer:
                    deadline = time.monotonic() + 8
                    while time.monotonic() < deadline:
                        waiting = observer.scalar(
                            text("SELECT wait_event_type FROM pg_stat_activity WHERE pid = :pid"),
                            {"pid": worker_pid[0]},
                        )
                        if waiting == "Lock":
                            break
                        time.sleep(0.02)
                    else:
                        raise AssertionError("La segunda transacción no esperó el bloqueo compartido")
                service.assign_drone(first, delivery_ids[0], data, user_id)
            finally:
                first.rollback()
                worker.join(timeout=15)
        assert not worker.is_alive(), "La asignación quedó bloqueada"
        assert not errors, errors
        assert results == ["ocupado"]
        with Session(engine) as db:
            assigned = db.scalar(
                select(func.count())
                .select_from(Delivery)
                .where(Delivery.drone_device_id == device_id, Delivery.status.in_(service.OPEN_STATUSES))
            )
            assert assigned == 1
            assert db.get(Delivery, delivery_ids[0]).status == DeliveryStatus.ASSIGNED
            assert db.get(Delivery, delivery_ids[1]).drone_device_id is None
    finally:
        with Session(engine) as db:
            db.execute(delete(DeliveryEvent).where(DeliveryEvent.delivery_id.in_(delivery_ids)))
            db.execute(delete(Delivery).where(Delivery.id.in_(delivery_ids)))
            db.execute(delete(Order).where(Order.id.in_(order_ids)))
            db.execute(delete(GpsDevice).where(GpsDevice.id == device_id))
            db.execute(delete(User).where(User.id == user_id))
            db.commit()
