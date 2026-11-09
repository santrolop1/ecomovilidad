# Estado del proyecto

Actualizado: 9 de noviembre de 2026. Detalle completo en [DOCUMENTACION.md](DOCUMENTACION.md) §20.

**Leyenda:**
- **IMPLEMENTADO:** real de punta a punta (FastAPI + PostgreSQL) y probado.
- **PARCIAL:** una parte real y otra pendiente.
- **MOCK:** solo con datos de demostración.
- **PENDIENTE:** no existe.

| Área | Estado | Observación |
| --- | --- | --- |
| Frontend | IMPLEMENTADO | 28 páginas públicas y 26 de panel; `API_MODE=mock` o `real`; responsive verificado de 360 a 1440 px. 97 pruebas Vitest. |
| Backend | IMPLEMENTADO | FastAPI `/api/v1`: catálogo, sucursales, cuentas, carrito, pedidos, pagos, facturas, alquileres, reembolsos y administración, en una carpeta por servicio (`backend/app/modules/`). 224 pruebas pytest. |
| Base de datos | IMPLEMENTADO | PostgreSQL 16 + PostGIS 3.6 en Docker; 34 tablas; migraciones 0001 a 0012; seed DEMO idempotente. |
| Auth | PARCIAL | Real: registro, login, logout, sesiones revocables, httpOnly, CSRF, rol `is_admin`, perfil, cambio y recuperación de contraseña (token hash, 30 min, un uso), límite de intentos. Correo por SMTP listo; falta contratar la cuenta. Pendiente: roles intermedios. |
| Catálogo | IMPLEMENTADO | Real y administrable desde el panel. Productos y marcas DEMO; fotos reales referenciales (Wikimedia Commons). |
| Sucursales | IMPLEMENTADO | Reales y administrables. **Datos DEMO** en Bucaramanga, Floridablanca, Girón y Piedecuesta. |
| Inventario | IMPLEMENTADO | Real: por sucursal, **reserva de 15 min al agregar al carrito (RF 6.2)** que pasa al pedido sin doble conteo, liberar al cancelar, descontar al pagar, ajustes con motivo, alertas y **registro de entradas y salidas** (`/admin/inventario/movimientos`, CU-13). El vencimiento se procesa en cada solicitud (o con `release-expired` por cron). |
| Carrito | IMPLEMENTADO | Persistente entre dispositivos, con contador "Reservado durante M:SS"; local (sin reserva) para visitantes; fusión al iniciar sesión. |
| Pedidos | IMPLEMENTADO | Real: crear, **pagar en línea (Wompi)**, inventario descontado al pagar, factura, "Mis pedidos", entregar en el panel. El cliente cancela lo no pagado y solicita reembolso de lo pagado; el panel lo registra (CU-15). Pendiente: historial de estados, devolución automática y nota crédito. |
| Alquileres | IMPLEMENTADO | Real: oferta con tarifas y flota, cotización, reserva de una unidad sin cruces (exclusión en la BD), pago, factura, "Mis alquileres", entrega/devolución y flota en el panel. Pendiente: domicilio, recargos, edición de tarifas. |
| Admin | IMPLEMENTADO | `/admin` protegido en FastAPI (rol en BD) y en cada página. Pendiente: carga de imágenes, auditoría, roles intermedios. |
| Ley 1581 | PARCIAL | Real: evidencia de consentimiento (usuario, fecha, versión `2026-10-06`) en registro y pedido; historial en `/cuenta`. Pendiente: texto legal revisado. |
| Pagos | PARCIAL | En producción: **pago manual** confirmado en el panel, o Wompi con sus llaves (integración con pruebas automáticas, **sin probar aún con llaves reales**). En desarrollo, pasarela de pruebas sin cobro real. Reembolsos: solicitud del cliente y registro en el panel; la devolución del dinero es manual. |
| Facturación | PARCIAL | Factura PDF y XML con consecutivo al aprobarse el pago. **No es factura electrónica DIAN.** |
| Mapa público | IMPLEMENTADO | Leaflet + OpenStreetMap en el inicio y `/sucursales`: sucursales con coordenadas de PostGIS y disponibilidad real; fallback "Mapa temporalmente no disponible". |
| Mapa operativo (admin) | IMPLEMENTADO | `/admin/operacion`: posiciones reales de los dispositivos registrados, recorrido, zonas y alertas. Sin dispositivos muestra la flota simulada con aviso de MODO DEMOSTRACIÓN. |
| GPS | PARCIAL | Real: ingesta por API con token por dispositivo, historial y asignación del más cercano. Probado con `scripts/simulate_gps.py`. Pendiente: conectar aparatos físicos. El historial antiguo se limpia con `housekeeping`. |
| WebSockets | PENDIENTE | El panel y el seguimiento consultan por intervalos (3 s y 15 s). |
| Geofencing | IMPLEMENTADO | Zonas circulares y alertas en `/admin/operacion/zonas`. |
| Domicilios | IMPLEMENTADO | `/admin/domicilios`: domiciliarios, asignación manual, estados con historial, fallo y reprogramación. Se crean al pagar. Pendiente: sesión propia del domiciliario. |
| QR | IMPLEMENTADO | El cliente muestra un QR y un código de 6 dígitos; el panel escribe el código. Sin escáner con cámara. |
| Firma digital | IMPLEMENTADO | Firma en pantalla como alternativa al QR. |
| Mantenimiento | IMPLEMENTADO | `/admin/flota`: uso, umbrales, aviso desde el 75 %, bloqueo al 90 % y bitácora inmutable. El uso se registra a mano, no sale del GPS. |
| CMS | PARCIAL | Real: propuesta de valor, banners y noticias en `/admin/contenidos`. Fijo: texto principal del inicio, servicios y ayuda. |
| Demo pública | IMPLEMENTADO (temporal) | `scripts/demo.sh`: Cloudflare Tunnel temporal hacia Next.js en el Mac; FastAPI y PostgreSQL solo en `127.0.0.1`. Ver [DEMO_PUBLICA.md](DEMO_PUBLICA.md). Sin despliegue en la nube. |
| Despliegue | PREPARADO | `docker-compose.prod.yml` con HTTPS, tareas programadas y copias de seguridad, probado desde cero en local. Falta contratar el servidor. Ver [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md). |
| Contacto | IMPLEMENTADO | Formulario real con límite de envíos; los mensajes se atienden en `/admin/mensajes`. |

## Datos de demostración

Ficticios hasta recibir datos reales de EcoMovilidad:
- sucursales, direcciones, teléfonos y coordenadas;
- productos, marcas y precios;
- datos de contacto del sitio.

## Limitaciones conocidas

- El checkout no muestra en qué sucursal quedó la reserva; una reserva repartida entre sucursales puede no bastar para un pedido de una sola sucursal.
- En producción el servicio `worker` vence reservas y pagos cada 5 minutos; en desarrollo se procesa en cada solicitud.
- Sin una cuenta SMTP la recuperación de contraseña solo funciona en desarrollo.
- El límite por IP solo se aplica cuando la IP es fiable (`TRUSTED_PROXIES`).
- Quien vuelve después de que su reserva venció no recibe aviso.
- La pasarela de pruebas solo se activa con `ENVIRONMENT=development` o `PAYMENT_PROVIDER=simulado`; sin definir, el entorno se trata como producción.

Las fotos son reales pero **referenciales** del tipo de producto (créditos en `/creditos`). Velox Carrera 110 no tiene foto ("Imagen pendiente").

## Próximos pasos

Ver [README.md](README.md#lo-que-falta) y [DOCUMENTACION.md](DOCUMENTACION.md) §24.
