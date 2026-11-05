# Requisitos verificables

Fuente: `SRS_EcoMovilidad_v3_0` (22/sep/2026). Módulo 8 tomado del Plan de Desarrollo (SDP).

**Estados:**
- **Implementado:** funciona de punta a punta con backend y base de datos reales y tiene pruebas.
- **Parcial:** parte real y parte pendiente; se indica cuál.
- **Mock:** solo existe con datos de demostración, sin backend.
- **Preparado:** existe el punto de integración (contrato, modelo o componente), pero no la funcionalidad.
- **Pendiente:** no existe.

## Discrepancias entre documentos

1. **SRS v3.0 (7 módulos) frente al SDP (8 módulos).** El SDP añade el Módulo 8 "Registro y Gestión de Usuarios" y se basó en el SRS **v2.0**. El SRS v3.0 no tiene requisitos de usuarios, aunque RF 6.3 exige usuarios autenticados. La autenticación se implementó como mínimo necesario para RF 6.3. **Pendiente:** emitir un SRS v3.1 que incluya o descarte el Módulo 8.
2. **Dos matrices de riesgo con los mismos ID.** El SDP §4.5 (riesgos de operación) y el documento "Análisis de riesgos" (riesgos de proyecto) usan R1–R10 para riesgos distintos. Hay que unificarlas.
3. **Pasarela:** el SRS dice "Wompi o PayU"; la arquitectura objetivo fija Wompi.
4. **Alcance geográfico:** el SRS habla de Colombia; la operación se limita al área metropolitana de Bucaramanga. Colombia aplica como marco legal.

## Módulo 1 — Web de presentación

| ID | Descripción | Estado | Implementación |
| --- | --- | --- | --- |
| RF-1.1 | Administradores actualizan propuesta de valor, banners y noticias sin desplegar código | **Mock** | Contrato `ContentApi` y vigencia de banners en el frontend; el contenido sale de `src/mocks/content.ts`. Sin modelo de contenido, sin endpoints, sin panel. |
| RF-1.2 | Mapa público con la disponibilidad de inventario por sucursal en tiempo real | **Parcial** | Real: `GET /branches` con disponibilidad por categoría desde la tabla `inventory`; refresco cada 60 s (`/api/branches`, TanStack Query); `branches.location` en PostGIS. Mapa real con Leaflet + OpenStreetMap (sin API key) en el inicio y `/sucursales`, con popups de disponibilidad por categoría y fallback. Pendiente: tiempo real por eventos (hoy es consulta periódica). |
| RF-1.3 | Metadatos dinámicos, URLs amigables y sitemap autogenerado | **Implementado** | `generateMetadata`, canonical, Open Graph y Twitter, `sitemap.ts` con los productos de la API, `robots.ts`, JSON-LD y 404 reales. |

## Módulo 2 — Panel de administración en tiempo real

| ID | Descripción | Estado | Implementación |
| --- | --- | --- | --- |
| RF-2.1 | Telemetría GPS de la flota con refresco ≤ 3 s | **Mock** | `/admin/operacion` muestra la flota con actualización cada 3 s, pero las posiciones son **simuladas** en el navegador (MODO DEMOSTRACIÓN). No hay dispositivos GPS, ingesta ni WebSockets. Interfaz `TelemetrySource` lista para la fuente real. |
| RF-2.2 | Geocercas con alertas | **Preparado** | Solo la base: PostGIS habilitado y columna `geography` con índice GiST en sucursales. No hay geocercas. |
| RF-2.3 | Dashboard de métricas de flota | **Mock** | `/admin/operacion` calcula activos, disponibles, en uso, en mantenimiento e incidencias, pero sobre la flota **simulada**. El resumen `/admin` sigue siendo comercial. |

## Módulo 3 — Mantenimiento preventivo

| ID | Descripción | Estado | Implementación |
| --- | --- | --- | --- |
| RF-3.1 | Umbrales por kilómetros u horas de vuelo | **Pendiente** | — |
| RF-3.2 | Bloqueo automático al 90% del umbral | **Mock** | Regla `requiresReview` con pruebas en el frontend, aplicada a la oferta de alquiler mock. Sin datos de uso en la base. |
| RF-3.3 | Bitácora inmutable de mantenimiento | **Pendiente** | — |

## Módulo 4 — Pasarela de pagos

| ID | Descripción | Estado | Implementación |
| --- | --- | --- | --- |
| RF-4.1 | PSE, tarjetas y billeteras digitales | **Implementado (pasarela de pruebas; Wompi listo para sus llaves)** | Wompi Web Checkout (tarjeta, PSE, Nequi y otros) para pedidos y alquileres: firma de integridad en FastAPI, verificación de la transacción con la llave privada, eventos con checksum e idempotencia, reintentos y vencimiento. 16 pruebas pytest. **Hoy** se usa la pasarela de pruebas propia (sin cobro real, mismo flujo) porque aún no hay llaves de Wompi; al configurarlas en `backend/.env` se usa Wompi sin cambiar código. |
| RF-4.2 | Factura electrónica DIAN (PDF y XML) | **Parcial** | Factura de venta PDF y XML con consecutivo, IVA y referencia del pago, descargable por el cliente y el panel. **No es factura electrónica DIAN**: falta resolución, CUFE y proveedor tecnológico. |
| RF-4.3 | Reembolsos con trazabilidad | **Parcial** | Trazabilidad real: solicitud del cliente con motivo (`refund_requests`), alerta en el panel y registro del reembolso (cancela y devuelve las unidades al inventario). Pagos aprobados fuera de plazo o duplicados marcados. Pendiente: devolución automática por la pasarela y nota crédito DIAN. |

## Módulo 5 — Domicilios con seguimiento

| ID | Descripción | Estado | Implementación |
| --- | --- | --- | --- |
| RF-5.1 | Asignación del domiciliario más cercano | **Pendiente** | — |
| RF-5.2 | Enlace de seguimiento en tiempo real | **Pendiente** | — |
| RF-5.3 | Estados Creado → Asignado → En recogida → En tránsito → Entregado / Fallido | **Pendiente** | Solo se describen en `/servicios`. Los pedidos tienen estados de compra, no de domicilio. |

## Módulo 6 — Venta de dispositivos nuevos

| ID | Descripción | Estado | Implementación |
| --- | --- | --- | --- |
| RF-6.1 | Catálogo con filtros por categoría, precio, marca y especificaciones | **Implementado** | `GET /products` (filtros, orden, facetas) + `/catalogo` y `/catalogo/[slug]`. Administrable desde `/admin/productos` (crear, editar, precio, especificaciones, destacados, activar). Pruebas en pytest y Vitest. |
| RF-6.2 | Reserva de 15 minutos al agregar al carrito; vuelve al stock si no se paga | **Implementado** | Tabla `cart_reservations` (migración 0003). Agregar al carrito con sesión aparta inventario con `SELECT … FOR UPDATE` durante 15 min (renovado en cada cambio). Las vencidas se liberan en cada solicitud a la API (`SKIP LOCKED`) o con `python -m app.cli release-expired`. Al crear el pedido la reserva pasa al pedido sin doble conteo; con reserva vencida el pedido se rechaza (409) y el checkout se bloquea. Contador en carrito y checkout. 15 pruebas pytest (incluida concurrencia con hilos) y pruebas Vitest. Con los pagos, el pedido tiene además un plazo de pago: si vence sin pago, se cancela y libera el inventario. **Límite:** el carrito de visitantes no reserva. |
| RF-6.3 | Carrito persistente entre dispositivos para usuarios autenticados | **Implementado** | `carts`/`cart_items` y `GET/POST/PATCH/DELETE /cart…`. Fusión del carrito local al iniciar sesión. Probado en pytest y en navegador con dos sesiones. |

## Módulo 7 — Solicitudes y reporte de entrega/recogida

| ID | Descripción | Estado | Implementación |
| --- | --- | --- | --- |
| RF-7.1 | Agendar por franjas horarias según la capacidad del día | **Parcial** | Real: el checkout elige fecha y franja; FastAPI valida fecha y franja y las guarda en `orders`. Mock: la lista de franjas y su disponibilidad. Pendiente: capacidad por franja y solicitudes de alquiler o mantenimiento. |
| RF-7.2 | Validación de entrega con código QR | **Pendiente** | — |
| RF-7.3 | Firma digital como alternativa al QR | **Pendiente** | — |

## Módulo 8 (SDP) — Registro y gestión de usuarios

| ID | Descripción | Estado | Implementación |
| --- | --- | --- | --- |
| M8-1 | Registro de usuarios | **Implementado** | `POST /auth/register`: argon2id, correo único, contraseña con letras y números, consentimiento obligatorio. |
| M8-2 | Inicio y cierre de sesión | **Implementado** | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`. Sesiones en servidor, revocables y con expiración; cookies httpOnly; CSRF. |
| M8-3 | Rol administrativo y gestión de cuentas | **Implementado** | `users.is_admin` (migración 0002), asignado por CLI (`python -m app.cli make-admin`). Panel `/admin/usuarios`: listar, buscar, ver y desactivar o reactivar (cierra sesiones). Protegido en FastAPI (403 sin rol). |
| M8-4 | Perfil propio | **Implementado** | `PATCH /auth/me` (nombre, apellido, celular, documento; otros campos → 422) y `POST /auth/password` (cierra otras sesiones). Página `/cuenta`. |
| M8-5 | Recuperación de contraseña | **Parcial** | Real: `POST /auth/password-reset/request` (202 genérico, máx. 3/h) y `/confirm` (cierra todas las sesiones); token SHA-256, 30 min, un uso; páginas `/recuperar` y `/recuperar/nueva`. Pendiente: proveedor de correo; en desarrollo el enlace se escribe en el log de la API. |
| M8-6 | Límite de intentos de login | **Implementado** | Tabla `login_attempts`: 5 fallos/cuenta y 30/IP en 15 min → 429 uniforme. IP solo de `X-Forwarded-For` de proxies en `TRUSTED_PROXIES`. Límites documentados en DOCUMENTACION.md §14. |
| M8-7 | Mis pedidos | **Implementado** | `GET /orders`, `GET /orders/{id}` (404 si es ajeno); `/cuenta/pedidos` y `/cuenta/pedidos/[id]`. Nunca muestra "Pago confirmado". |
| M8-8 | Roles intermedios (operador, domiciliario) | **Pendiente** | — |

## Requisitos no funcionales

| ID | Descripción | Estado | Implementación |
| --- | --- | --- | --- |
| RNF-3.2 | Interfaz adaptable a móviles | **Implementado** | Revisado a 360, 390, 768, 1024, 1280 y 1440 px sin desbordamientos (incluidas las rutas de cuenta, carrito y checkout). |
| RNF-3.3 | Disponibilidad 99,9% con réplicas | **Pendiente** | Solo existe el entorno local con Docker Compose. |
| RNF-3.4 | Carga inicial < 1,8 s; mapa < 3 s | **Pendiente** (medición) | Hay SSG/ISR, Server Components y carga diferida de Leaflet (solo en las páginas con mapa), pero no se ha medido. |
| RNF-3.5 | API RESTful escalable | **Implementado** | FastAPI versionada en `/api/v1`. |
| RNF-3.6 | HTTPS/TLS 1.3 y WSS | **Pendiente** | Local por HTTP. Las cookies son `Secure` en producción. Sin WebSockets. |
| RNF-3.7 | FAQ y manuales en el portal | **Mock** | `/ayuda` con contenido mock; sin manuales. |
| LEG-1581 | Tratamiento de datos (Habeas Data) | **Parcial** | Real: consentimiento obligatorio y **evidencia** en `consent_records` (usuario, fecha, versión de la política, pedido) en registro y en cada pedido; versión desactualizada → 409; historial en `/cuenta`. Pendiente: texto legal definitivo revisado por un abogado. |
| LEG-1480 | Estatuto del Consumidor y retracto | **Pendiente** | Solo hay texto informativo. |
| LEG-AEROCIVIL | Normativa RAC para drones | **Pendiente** | Solo hay aviso informativo en las fichas de drones. |
| PCI-DSS | Datos de tarjeta | **Implementado** | Los datos de pago se capturan solo en Wompi (Web Checkout); EcoMovilidad no los recibe ni los guarda. |

## Casos de uso (diagramas de secuencia)

| CU | Caso de uso | Estado | Implementación |
| --- | --- | --- | --- |
| CU-01 | Registrarse / iniciar sesión | **Implementado** | Sesión con cookie httpOnly (equivale al "token de sesión" del diagrama). |
| CU-02 | Consultar catálogo | **Implementado** | Filtros, lista y detalle con stock por sucursal. |
| CU-03 | Comprar dispositivo | **Implementado (pago de pruebas)** | Disponibilidad, reserva de 15 min, pago con Wompi, confirmación, descuento de inventario al pagar y factura (sin validación DIAN). |
| CU-04 | Solicitar alquiler | **Implementado** | Vehículo y fechas, verificación de disponibilidad, reserva de una unidad, pago y confirmación. |
| CU-05 | Realizar pago | **Implementado (pago de pruebas)** | Hoy con la pasarela de pruebas propia; listo para Wompi al configurar sus llaves. Redirección a la pasarela, autenticación y pago en la pasarela, confirmación verificada y comprobante (factura PDF/XML). |
| CU-06 | Agendar entrega o recogida | **Parcial** | Fecha, franja y dirección reales; franjas mock y sin asignación de domiciliario. |
| CU-07 | Seguimiento del domicilio | **Pendiente** | — |
| CU-08 | Validar entrega con QR o firma | **Pendiente** | — |
| CU-09 | Gestionar contenidos | **Mock** | Contenido en `src/mocks/content.ts`. |
| CU-10 | Monitorear flota en tiempo real | **Mock** | `/admin/operacion` con posiciones simuladas (sin GPS). |
| CU-11 | Geofencing | **Pendiente** | Solo la base PostGIS. |
| CU-12 | Mantenimiento preventivo | **Parcial** | Unidades de la flota en mantenimiento salen de la oferta; sin umbrales, alertas ni bitácora. |
| CU-13 | Gestionar inventario | **Implementado** | Consulta y ajuste por sucursal con motivo obligatorio; registro de entradas y salidas (`inventory_movements`) con ventas y devoluciones automáticas, en `/admin/inventario/movimientos`. |
| CU-14 | Gestionar domicilios | **Pendiente** | — |
| CU-15 | Reembolso / cancelación | **Implementado (reembolso manual)** | El cliente cancela lo no pagado o solicita el reembolso de lo pagado; el panel valida y registra (cancela y devuelve inventario). La devolución del dinero se hace en la pasarela; falta la nota crédito DIAN. |
