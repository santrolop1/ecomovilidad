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
| RF-1.2 | Mapa público con la disponibilidad de inventario por sucursal en tiempo real | **Parcial** | Real: `GET /branches` con disponibilidad por categoría desde la tabla `inventory`; refresco cada 60 s (`/api/branches`, TanStack Query); `branches.location` en PostGIS. Pendiente: mapa con calles (el adaptador de Google Maps no está probado con una key), tiempo real por eventos. |
| RF-1.3 | Metadatos dinámicos, URLs amigables y sitemap autogenerado | **Implementado** | `generateMetadata`, canonical, Open Graph y Twitter, `sitemap.ts` con los productos de la API, `robots.ts`, JSON-LD y 404 reales. |

## Módulo 2 — Panel de administración en tiempo real

| ID | Descripción | Estado | Implementación |
| --- | --- | --- | --- |
| RF-2.1 | Telemetría GPS de la flota con refresco ≤ 3 s | **Pendiente** | — |
| RF-2.2 | Geocercas con alertas | **Preparado** | Solo la base: PostGIS habilitado y columna `geography` con índice GiST en sucursales. No hay geocercas. |
| RF-2.3 | Dashboard de métricas de flota | **Pendiente** | El panel `/admin` tiene un resumen comercial (pedidos, inventario, usuarios, alquileres registrados), no métricas de flota en tiempo real (activa, en mantenimiento, alquilada, en tránsito). |

## Módulo 3 — Mantenimiento preventivo

| ID | Descripción | Estado | Implementación |
| --- | --- | --- | --- |
| RF-3.1 | Umbrales por kilómetros u horas de vuelo | **Pendiente** | — |
| RF-3.2 | Bloqueo automático al 90% del umbral | **Mock** | Regla `requiresReview` con pruebas en el frontend, aplicada a la oferta de alquiler mock. Sin datos de uso en la base. |
| RF-3.3 | Bitácora inmutable de mantenimiento | **Pendiente** | — |

## Módulo 4 — Pasarela de pagos

| ID | Descripción | Estado | Implementación |
| --- | --- | --- | --- |
| RF-4.1 | PSE, tarjetas y billeteras digitales | **Preparado** | El checkout guarda el método elegido en `orders.payment_method` y el contrato admite `paymentRedirectUrl`. No hay cobro ni integración con Wompi. |
| RF-4.2 | Factura electrónica DIAN (PDF y XML) | **Pendiente** | — |
| RF-4.3 | Reembolsos con trazabilidad | **Pendiente** | El panel cancela pedidos y libera inventario, pero no hay pagos que reembolsar ni registro del motivo. |

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
| RF-6.2 | Reserva de 15 minutos al agregar al carrito; vuelve al stock si no se paga | **Pendiente** | Hoy el inventario se aparta al **crear el pedido** (`available` → `reserved`, con bloqueo de filas) y el panel lo libera al cancelar o lo descuenta al completar. No hay reserva al agregar al carrito ni vencimiento automático. |
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
| M8-4 | Perfil propio, recuperación de contraseña, roles intermedios (operador, domiciliario) | **Pendiente** | — |

## Requisitos no funcionales

| ID | Descripción | Estado | Implementación |
| --- | --- | --- | --- |
| RNF-3.2 | Interfaz adaptable a móviles | **Implementado** | Revisado a 390 px y 1280 px sin desbordamientos. |
| RNF-3.3 | Disponibilidad 99,9% con réplicas | **Pendiente** | Solo existe el entorno local con Docker Compose. |
| RNF-3.4 | Carga inicial < 1,8 s; mapa < 3 s | **Pendiente** (medición) | Hay SSG/ISR, Server Components y carga diferida del mapa, pero no se ha medido. |
| RNF-3.5 | API RESTful escalable | **Implementado** | FastAPI versionada en `/api/v1`. |
| RNF-3.6 | HTTPS/TLS 1.3 y WSS | **Pendiente** | Local por HTTP. Las cookies son `Secure` en producción. Sin WebSockets. |
| RNF-3.7 | FAQ y manuales en el portal | **Mock** | `/ayuda` con contenido mock; sin manuales. |
| LEG-1581 | Tratamiento de datos (Habeas Data) | **Parcial** | El consentimiento es obligatorio y FastAPI lo valida en registro y pedido. Pendiente: guardar la evidencia (fecha y versión de la política) y el texto legal definitivo. |
| LEG-1480 | Estatuto del Consumidor y retracto | **Pendiente** | Solo hay texto informativo. |
| LEG-AEROCIVIL | Normativa RAC para drones | **Pendiente** | Solo hay aviso informativo en las fichas de drones. |
| PCI-DSS | Datos de tarjeta | **Preparado** | El frontend y el backend no reciben datos de tarjeta; el pago irá en la pasarela. |
