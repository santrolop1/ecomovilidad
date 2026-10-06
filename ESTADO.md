# Estado del proyecto

Actualizado: 6 de octubre de 2026. Detalle completo en [DOCUMENTACION.md](DOCUMENTACION.md) §20.

**Leyenda:**
- **IMPLEMENTADO:** real de punta a punta (FastAPI + PostgreSQL) y probado.
- **PARCIAL:** una parte real y otra pendiente.
- **MOCK:** solo con datos de demostración.
- **PENDIENTE:** no existe.

| Área | Estado | Observación |
| --- | --- | --- |
| Frontend | IMPLEMENTADO | 16 rutas públicas y 14 de panel; `API_MODE=mock` o `real`; responsive verificado de 360 a 1440 px. 54 pruebas Vitest. |
| Backend | IMPLEMENTADO | FastAPI `/api/v1`: catálogo, sucursales, cuentas, carrito, pedidos, alquileres (lectura) y administración. 81 pruebas pytest. |
| Base de datos | IMPLEMENTADO | PostgreSQL 16 + PostGIS 3.6 en Docker; 11 tablas; migraciones 0001 y 0002 reversibles; seed DEMO idempotente. |
| Auth | PARCIAL | Real: registro, login, logout, sesiones revocables, httpOnly, CSRF y rol `is_admin`. Pendiente: recuperación de contraseña, perfil, límite de intentos. |
| Catálogo | IMPLEMENTADO | Real y administrable desde el panel. Productos y marcas DEMO; fotos reales referenciales (Wikimedia Commons). |
| Sucursales | IMPLEMENTADO | Reales y administrables. **Datos DEMO** en Bucaramanga, Floridablanca, Girón y Piedecuesta. |
| Inventario | PARCIAL | Real: por sucursal, reserva al crear el pedido, liberar al cancelar, descontar al completar, ajustes y alertas en el panel. Pendiente: reserva de 15 min (RF 6.2) y auditoría. |
| Carrito | IMPLEMENTADO | Persistente entre dispositivos; local para visitantes; fusión al iniciar sesión. |
| Pedidos | PARCIAL | Real: crear, listar y gestionar estados (confirmar, completar, cancelar). Pendiente: pagos, historial de estados, "mis pedidos". |
| Alquileres | PARCIAL | Real: tabla `rentals` y consultas (cliente y panel). MOCK: oferta y tarifas de `/alquiler`. Pendiente: crear alquileres. |
| Admin | IMPLEMENTADO | `/admin` protegido en FastAPI (rol en BD) y en cada página. Pendiente: carga de imágenes, auditoría, roles intermedios. |
| Pagos | PENDIENTE | Wompi no integrado; solo se guarda el método elegido. |
| Maps | PARCIAL | Coordenadas reales y `geography` en PostGIS; mapa esquemático. Google Maps sin probar con una key real. |
| GPS | PENDIENTE | — |
| WebSockets | PENDIENTE | — |
| Domicilios | PENDIENTE | Sin asignación, seguimiento ni estados de domicilio. |
| QR | PENDIENTE | — |
| Firma digital | PENDIENTE | — |
| Mantenimiento | MOCK | Regla del 90% solo sobre la oferta mock de alquiler. |
| CMS | MOCK | `src/mocks/content.ts`. |
| Contacto | PENDIENTE | En modo real responde "no disponible". |

## Datos de demostración

Ficticios hasta recibir datos reales de EcoMovilidad:
- sucursales, direcciones, teléfonos y coordenadas;
- productos, marcas y precios;
- datos de contacto del sitio;
- credenciales del administrador de desarrollo (`admin@ecomovilidad.dev`, solo en `docker-compose.yml`).

Las fotos son reales pero **referenciales** del tipo de producto (créditos en `/creditos`). Velox Carrera 110 no tiene foto ("Imagen pendiente").

## Próximos pasos

Ver [DOCUMENTACION.md](DOCUMENTACION.md) §24.
