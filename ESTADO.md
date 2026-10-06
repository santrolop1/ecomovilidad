# Estado del proyecto

Actualizado: 6 de octubre de 2026. Detalle completo en [DOCUMENTACION.md](DOCUMENTACION.md) §20.

**Leyenda:**
- **IMPLEMENTADO:** real de punta a punta (FastAPI + PostgreSQL) y probado.
- **PARCIAL:** una parte real y otra pendiente.
- **MOCK:** solo con datos de demostración.
- **PENDIENTE:** no existe.

| Área | Estado | Observación |
| --- | --- | --- |
| Frontend | IMPLEMENTADO | 21 rutas públicas (incluye `/cuenta`, `/cuenta/pedidos`, `/recuperar`) y 14 de panel; `API_MODE=mock` o `real`; responsive verificado de 360 a 1440 px. 71 pruebas Vitest. |
| Backend | IMPLEMENTADO | FastAPI `/api/v1`: catálogo, sucursales, cuentas, carrito, pedidos, alquileres (lectura) y administración. 121 pruebas pytest. |
| Base de datos | IMPLEMENTADO | PostgreSQL 16 + PostGIS 3.6 en Docker; 15 tablas; migraciones 0001, 0002 y 0003 reversibles; seed DEMO idempotente. |
| Auth | PARCIAL | Real: registro, login, logout, sesiones revocables, httpOnly, CSRF, rol `is_admin`, perfil, cambio y recuperación de contraseña (token hash, 30 min, un uso), límite de intentos (5/cuenta, 30/IP fiable, 15 min). Pendiente: proveedor de correo real (en desarrollo el enlace va al log de la API), roles intermedios. |
| Catálogo | IMPLEMENTADO | Real y administrable desde el panel. Productos y marcas DEMO; fotos reales referenciales (Wikimedia Commons). |
| Sucursales | IMPLEMENTADO | Reales y administrables. **Datos DEMO** en Bucaramanga, Floridablanca, Girón y Piedecuesta. |
| Inventario | PARCIAL | Real: por sucursal, **reserva de 15 min al agregar al carrito (RF 6.2)** que pasa al pedido sin doble conteo, liberar al cancelar, descontar al completar, ajustes y alertas. El vencimiento se procesa en cada solicitud (o con `release-expired` por cron). Pendiente: auditoría. |
| Carrito | IMPLEMENTADO | Persistente entre dispositivos, con contador "Reservado durante M:SS"; local (sin reserva) para visitantes; fusión al iniciar sesión. |
| Pedidos | PARCIAL | Real: crear (bloqueado si la reserva venció), "Mis pedidos" con lista y detalle (404 para ajenos), gestionar estados en el panel. Pendiente: pagos, historial de estados, cancelación por el cliente. |
| Alquileres | PARCIAL | Real: tabla `rentals` y consultas (cliente y panel). MOCK: oferta y tarifas de `/alquiler`. Pendiente: crear alquileres. |
| Admin | IMPLEMENTADO | `/admin` protegido en FastAPI (rol en BD) y en cada página. Pendiente: carga de imágenes, auditoría, roles intermedios. |
| Ley 1581 | PARCIAL | Real: evidencia de consentimiento (usuario, fecha, versión `2026-10-06`) en registro y pedido; historial en `/cuenta`. Pendiente: texto legal revisado. |
| Pagos | PENDIENTE | Wompi no integrado; solo se guarda el método elegido. |
| Maps | PARCIAL | Coordenadas reales y `geography` en PostGIS; mapa esquemático. Google Maps sin probar con una key real. |
| GPS | PENDIENTE | — |
| WebSockets | PENDIENTE | — |
| Domicilios | PENDIENTE | Sin asignación, seguimiento ni estados de domicilio. |
| QR | PENDIENTE | — |
| Firma digital | PENDIENTE | — |
| Mantenimiento | MOCK | Regla del 90% solo sobre la oferta mock de alquiler. |
| CMS | MOCK | `src/mocks/content.ts`. |
| Demo pública | IMPLEMENTADO (temporal) | `scripts/demo.sh`: Cloudflare Tunnel temporal hacia Next.js en el Mac; FastAPI y PostgreSQL solo en `127.0.0.1`. Ver [DEMO_PUBLICA.md](DEMO_PUBLICA.md). Sin despliegue en la nube. |
| Contacto | PENDIENTE | En modo real responde "no disponible". |

## Datos de demostración

Ficticios hasta recibir datos reales de EcoMovilidad:
- sucursales, direcciones, teléfonos y coordenadas;
- productos, marcas y precios;
- datos de contacto del sitio;
- credenciales del administrador de desarrollo (`admin@ecomovilidad.dev`, solo en `docker-compose.yml`).

## Limitaciones conocidas de la fase 4

- El checkout no muestra en qué sucursal quedó la reserva; una reserva repartida entre sucursales puede no bastar para un pedido de una sola sucursal.
- El vencimiento de reservas es perezoso (en cada solicitud a la API); sin tráfico, usar `release-expired` en un cron.
- No hay proveedor de correo: la recuperación solo funciona de punta a punta en desarrollo.
- El límite por IP solo se aplica cuando la IP es fiable (`TRUSTED_PROXIES`).
- Quien vuelve después de que su reserva venció no recibe aviso.
- Los pagos siguen pendientes: ningún pedido figura como pagado.

Las fotos son reales pero **referenciales** del tipo de producto (créditos en `/creditos`). Velox Carrera 110 no tiene foto ("Imagen pendiente").

## Próximos pasos

Ver [DOCUMENTACION.md](DOCUMENTACION.md) §24.
