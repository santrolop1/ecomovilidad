# Domicilios con dron, salida y entrada en sucursal y mantenimiento por tiempo

Rama: `feature/domicilios-dron-salidas-mantenimiento`. No modifica `main`; se fusiona después de revisión.

Responde a los puntos acordados en la reunión del equipo:

| Pedido del equipo | Qué se hizo |
| --- | --- |
| Mejorar los domicilios con dron: ¿cómo se sabe que se entregó el paquete? | El GPS del dron prueba que liberó el paquete a menos de 50 m del punto de entrega y el cliente confirma en su cuenta que lo recibió. Si no confirma ni reclama en 30 minutos, el panel cierra con la evidencia del dron. |
| El administrador debe seguir vehículos, domiciliarios y drones en domicilios | El mapa de Operación dice quién es cada activo y qué hace ("Llevando un domicilio en Girón", "Alquilado hasta…"), dibuja la línea hasta el punto de entrega del dron y enlaza al domicilio. La flota simulada también muestra drones llevando domicilios. |
| Recoger en sucursal: la sucursal registra la salida y la entrada; si salió, el vehículo aparece no disponible | El detalle del alquiler tiene *Registrar salida* y *Registrar entrada* (con el uso). Mientras está afuera, la unidad aparece *Afuera con un cliente* en la flota y no se ofrece en `/alquiler`. Si la devolución está vencida, tampoco se vuelve a reservar. |
| Mantenimiento cada cierto tiempo en el panel | Cada unidad tiene revisión periódica (90 días; 60 los drones, editable). El panel muestra la próxima revisión, avisa 7 días antes y al vencer la unidad sale de la oferta hasta registrar el mantenimiento. |

## Reglas

### Domicilio con dron (CU-08, CU-14)

1. Un dron de domicilios es un dispositivo GPS de tipo `dron` sin domiciliario ni unidad de alquiler.
2. Al asignarlo se guarda el punto exacto de entrega, que debe estar dentro de una zona permitida. Un dron no lleva dos domicilios a la vez.
3. En camino, el dron avisa `POST /api/telemetry/drops` con su token y la posición donde soltó el paquete. Si no puede avisar, el panel lo registra con la última posición GPS del dron (de menos de 2 minutos). En ambos casos se rechaza si está a más de 50 m del punto.
4. Con el paquete liberado, el cliente confirma en *Mis pedidos* (`POST /api/v1/orders/{id}/delivery/confirm`). El panel también puede validar con el código del cliente. La firma no aplica a drones.
5. Pasados 30 minutos sin confirmación ni reclamo, el panel puede cerrar con la evidencia del dron (`proofMethod = "dron"`).
6. La base de datos impide un domicilio con domiciliario y dron a la vez, un dron sin punto de entrega y una prueba de dron sin liberación registrada.

### Salida y entrada en sucursal (CU-04, CU-06)

- `POST /api/v1/admin/rentals/{id}/check-out`: solo un alquiler pagado; la unidad no puede estar en mantenimiento ni afuera con otro cliente.
- `POST /api/v1/admin/rentals/{id}/check-in` con `usage` (km u horas): suma al mantenimiento y puede bloquear la unidad.
- El cambio de estado anterior (`PATCH /rentals/{id}` a `active` o `completed`) sigue funcionando y también registra salida y entrada.

### Mantenimiento por tiempo (CU-12)

- Columnas nuevas: `service_interval_days` y `last_service_at`. Terminar el mantenimiento reinicia el plazo.
- `PUT /api/v1/admin/rental-units/{id}/interval` cambia el plazo y queda en la bitácora.
- Una unidad vencida no se ofrece ni sale de la sucursal, y no vuelve a `operativo` sin registrar el mantenimiento.

## Archivos

- Migración: `backend/alembic/versions/0013_drones_salidas_y_mantenimiento_por_tiempo.py`.
- Backend: `domicilios` (modelo, esquemas, servicio), `telemetria` (flota con actividad, `/telemetry/drops`), `alquiler` (mantenimiento por tiempo, disponibilidad), `admin` (rutas nuevas, salida y entrada), `pedidos` (confirmación del cliente), `db/seed.py` (plazo de 60 días para drones).
- Pruebas nuevas: `backend/tests/test_domicilios_dron.py`, `test_salida_y_entrada.py`, `test_mantenimiento_por_tiempo.py`; casos nuevos en `src/features/admin/lib/schemas.test.ts` y `src/features/operations/lib/simulated-telemetry.test.ts`.
- Frontend: panel de domicilios (dron, liberación, evidencia), detalle del alquiler (salida y entrada), flota (dónde está y próxima revisión), operación (actividad de cada activo), *Mis pedidos* (botón *Recibí mi pedido*) y seguimiento público (indica que lo lleva un dron).
- `scripts/simulate_gps.py`: `--destino LAT,LNG --liberar` simula el vuelo y el aviso del dron.
- Proxy: `src/app/api/telemetry/drops/route.ts`.

## Pendiente

- El punto de entrega del dron se escribe con coordenadas; falta elegirlo en el mapa o geocodificar la dirección.
- La foto del paquete entregado por el dron no se guarda todavía.
- No hay un proceso en segundo plano que pase las unidades vencidas a *mantenimiento*: dejan de ofrecerse al instante y el estado cambia al registrar uso, plazo o mantenimiento.
