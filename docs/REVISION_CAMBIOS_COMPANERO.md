# Revisión de dron, sucursal y mantenimiento

Revisado el 16 de noviembre de 2026 sobre `993b14f` y la rama de trabajo
`frontend/diagramas-ecomovilidad`. Revisión estática y consulta del CI remoto;
no se ejecutó PostgreSQL ni el backend en esta PC porque no hay Docker ni uv
instalados. No se importó ni ejecutó el `.bat` mencionado en el mensaje.

## Los cambios ya están incluidos

El commit `65c8734` está en el historial de `origin/main`. El merge `993b14f`
incluye la rama `feature/domicilios-dron-salidas-mantenimiento`, además de las
correcciones `8a0f760` (refresco de la relación del dron) y `a382d47`
(documentación). No hace falta volver a importar el bundle ni aplicar el ZIP
sobre esta copia: duplicaría trabajo ya fusionado.

| Punto del mensaje | Evidencia en la implementación |
|---|---|
| Dron, radio de 50 m y confirmación del cliente | `domicilios/service.py`: `assign_drone`, `_record_drop`, `validate_delivery`, `confirm_receipt`; prueba del dueño del pedido antes de confirmar |
| Operación con actividad por activo | `telemetria/service.py`, `src/features/operations/` y simulador |
| Salida / entrada y uso | `admin/rentals.py`: `_check_out`, `_check_in`; `alquiler/service.py`: `_free_units`, `units_out` |
| Revisión periódica | `alquiler/maintenance.py`, `rental_units.service_interval_days` y `last_service_at` |
| Cambios de esquema | `backend/alembic/versions/0013_drones_salidas_y_mantenimiento_por_tiempo.py` |

## Validación existente, confirmada

El [CI del merge](https://github.com/santrolop1/ecomovilidad/actions/runs/43762173744)
terminó correctamente el 15 de noviembre de 2026. Sus logs muestran:

- Backend: **242 pruebas pasadas**; Ruff, formato, migraciones y `alembic check` correctos.
- Frontend de ese commit: **103 pruebas pasadas**, con typecheck, lint y build.
- Búsqueda de secretos en el historial: correcta.

Esto supera el estado de incertidumbre del mensaje original: sí hay evidencia
posterior de ejecución en CI. No demuestra funcionamiento con un dron físico,
llaves reales de Wompi ni SMTP contratado.

## Hallazgo a corregir

**[P2] Dos asignaciones simultáneas pueden compartir el mismo dron.**
En `backend/app/modules/domicilios/service.py:234`, `assign_drone` bloquea el
domicilio concreto; carga el GPS con `db.get` y consulta si está ocupado sin
bloquear ese dispositivo. Dos peticiones para domicilios diferentes pueden
observar cero asignaciones y confirmar ambas. El modelo y la migración 0013 no
declaran un índice único parcial que impida dos domicilios abiertos para el
mismo `drone_device_id`.

La prueba `test_solo_drones_de_domicilios_dentro_de_las_zonas` comprueba el caso
secuencial, pero no esa carrera concurrente. La conclusión se basa en el orden
de consultas y los bloqueos del código; no se reprodujo con PostgreSQL aquí.

Corrección recomendada: serializar asignaciones mediante bloqueo del dispositivo
GPS antes de contar sus domicilios abiertos y añadir una prueba concurrente con
dos conexiones. Un índice único parcial puede reforzar la garantía, con una
migración nueva y manejo del conflicto. Este informe no modifica esas reglas.

## Precisiones para la demostración

- **30 minutos:** habilitan que el administrador cierre desde el panel con la
  evidencia del dron. No existe un temporizador que cierre automáticamente el
  domicilio. La firma no sirve para entrega por dron; sí puede usarse el código
  del cliente después de registrar la liberación.
- **Reclamación:** no hay un estado ni ruta de reclamo autónomo del cliente
  asociado al plazo. Un fallo registrado impide el cierre normal. No presentar
  el plazo como un sistema completo de controversias automatizado.
- **GPS:** el token y las coordenadas constituyen evidencia reportada por el
  dispositivo; no validan por sí solos que un aparato físico haya soltado un
  paquete. El proyecto está probado con simulador.
- **Mantenimiento:** el filtro de disponibilidad aplica el vencimiento aunque
  el estado persistido aún diga `operativo`; no es necesario un cron para que
  deje de ofrecerse. La interfaz debe mostrar esa diferencia.
- **Migración 0013:** debe estar aplicada antes de probar la API. El arranque de
  Docker Compose ya ejecuta `alembic upgrade head`.
- **Windows:** el script de demo existente es de Mac/Colima. Usar la guía
  [DEMO_MOVIL_WINDOWS.md](DEMO_MOVIL_WINDOWS.md).
