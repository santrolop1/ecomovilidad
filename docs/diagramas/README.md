# Diagramas de EcoMovilidad

Documentación preparada el 16 de noviembre de 2026 sobre el código base
`993b14f5b3b2e9e5f91afbb8892c83689bfe1444`.

Incluye los 27 diagramas solicitados y cinco ampliaciones del DER para leer sus
34 tablas por dominio. El cierre del viaje se modela como devolución del
alquiler; el cierre de sesión aparece junto con el inicio de sesión.

## Cómo leer y editar

- Abrir `index.html`: visor sin conexión, búsqueda, filtros, ampliación,
  impresión, descarga del SVG y código Mermaid de cada gráfico.
- Editar los archivos `.mmd`; los `.svg` son versiones renderizadas.
- `manifest.json` conserva notas, estado y referencias al código con líneas.
- `DICCIONARIO_DATOS.md` detalla todas las columnas y claves de los modelos.
- `FUENTES.md` reúne las definiciones Mermaid para lectores compatibles.

Las cajas C4 y los casos de uso usan formas de Mermaid con semántica explícita;
no son exportaciones de herramientas UML certificadas. Las vistas BCE clasifican
componentes, módulos funcionales y entidades; no afirman que los servicios Python
sean clases. El DER se extrajo estáticamente, sin consultar una base desplegada.

## Límites del sistema real

- Domiciliarios y operadores no tienen roles independientes. Las tareas de
  operación se ejecutan con `users.is_admin`; el domiciliario comunica el avance.
- El desbloqueo remoto es una **propuesta no implementada**. No se añade código
  de cerradura ni se presenta su diagrama como un flujo disponible.
- Cierre del viaje: entrada física en sucursal registrada por administrador.
- Los pagos dependen de la configuración: pruebas, manual o Wompi.
- La factura es de venta, **sin validación DIAN**.
- Los mapas consultan datos periódicamente; no hay WebSockets.
- El despliegue representa `docker-compose.prod.yml`, no un servidor publicado.
- En caso de contradicción con documentación anterior, se priorizó el código
  actual: existen geocercas, agenda con cupos y reembolsos registrados manualmente.

## Índice



### Análisis

- [Contexto del SRS](01-contexto-srs.svg) · [Implementado](01-contexto-srs.mmd)
- [Casos de uso: general](02-casos-general.svg) · [Implementado](02-casos-general.mmd)
- [Casos de uso: cliente](03-casos-cliente.svg) · [Implementado](03-casos-cliente.mmd)
- [Casos de uso: operador](04-casos-operador.svg) · [Implementado con rol administrador](04-casos-operador.mmd)
- [Casos de uso: domiciliario](05-casos-domiciliario.svg) · [Proceso asistido; rol propio pendiente](05-casos-domiciliario.mmd)
- [DFD nivel 0](06-dfd-nivel-0.svg) · [Implementado](06-dfd-nivel-0.mmd)
- [DFD nivel 1](07-dfd-nivel-1.svg) · [Implementado](07-dfd-nivel-1.mmd)

### Arquitectura y diseño

- [C4: contexto](08-c4-contexto.svg) · [Implementado](08-c4-contexto.mmd)
- [C4: contenedores](09-c4-contenedores.svg) · [Implementado](09-c4-contenedores.mmd)
- [Diagrama de paquetes](10-paquetes.svg) · [Implementado](10-paquetes.mmd)
- [Diagrama de componentes](11-componentes.svg) · [Implementado](11-componentes.mmd)
- [Diagrama de nodos / despliegue](12-despliegue.svg) · [Configuración de despliegue preparada](12-despliegue.mmd)

### Estructurales

- [Diagrama de clases persistentes](13-clases.svg) · [Implementado](13-clases.mmd)
- [Diagrama de clases BCE](14-clases-bce.svg) · [Implementado](14-clases-bce.mmd)
- [Modelo de datos / DER completo](15-modelo-datos.svg) · [Implementado](15-modelo-datos.mmd)

### Comportamiento

- [Secuencia: registro](16-secuencia-registro.svg) · [Implementado](16-secuencia-registro.mmd)
- [Secuencia: inicio y cierre de sesión](17-secuencia-login.svg) · [Implementado](17-secuencia-login.mmd)
- [Secuencia: cierre del viaje / devolución](18-secuencia-cierre-viaje.svg) · [Implementado](18-secuencia-cierre-viaje.mmd)
- [Secuencia: compra y pago](19-secuencia-compra-pago.svg) · [Implementado](19-secuencia-compra-pago.mmd)
- [Secuencia: alquiler y pago](20-secuencia-alquiler-pago.svg) · [Implementado](20-secuencia-alquiler-pago.mmd)
- [Secuencia: desbloqueo remoto propuesto](21-secuencia-desbloqueo.svg) · [Propuesto; no implementado](21-secuencia-desbloqueo.mmd)
- [Secuencia: alertas de vehículos](22-secuencia-alertas.svg) · [Implementado](22-secuencia-alertas.mmd)
- [Secuencia: entrega a domicilio](23-secuencia-entrega.svg) · [Implementado](23-secuencia-entrega.mmd)
- [Estados: reserva de alquiler](24-estados-reserva.svg) · [Implementado](24-estados-reserva.mmd)
- [Estados: vehículo](25-estados-vehiculo.svg) · [Implementado](25-estados-vehiculo.mmd)
- [Estados: entrega](26-estados-entrega.svg) · [Implementado](26-estados-entrega.mmd)

### Gestión

- [Matriz de riesgos](27-matriz-riesgos.svg) · [Evaluación propuesta](27-matriz-riesgos.mmd)

### Anexos

- [DER ampliado: identidad](anexo-der-identidad.svg) · [Implementado](anexo-der-identidad.mmd)
- [DER ampliado: comercio](anexo-der-comercio.svg) · [Implementado](anexo-der-comercio.mmd)
- [DER ampliado: alquiler](anexo-der-alquiler.svg) · [Implementado](anexo-der-alquiler.mmd)
- [DER ampliado: pagos](anexo-der-pagos.svg) · [Implementado](anexo-der-pagos.mmd)
- [DER ampliado: logistica](anexo-der-logistica.svg) · [Implementado](anexo-der-logistica.mmd)

## Matriz de riesgos y tratamiento

Valoración inicial propuesta, pendiente de validación por el equipo. Escala ordinal P e I de 1 a 5; prioridad = P × I, no probabilidad estadística. Alta ≥ 12, media 6–11 y baja ≤ 5. Los responsables son funciones sugeridas, no asignaciones personales.

| Riesgo | P | I | P×I | Control existente | Acción propuesta | Responsable sugerido |
|---|---:|---:|---:|---|---|---|
| R1: Pago duplicado o tardío | 3 | 4 | 12 | Idempotencia, bloqueo de pago y requires_refund ya implementados. | Conciliar pasarela y reembolso manual. | Operación / pagos |
| R2: Sobreventa / doble reserva de unidad | 2 | 5 | 10 | Bloqueos de inventario y exclusión GiST de periodos. | Mantener pruebas concurrentes y revisar errores de integridad. | Backend |
| R3: GPS ausente o desactualizado | 4 | 3 | 12 | Marca de última posición y fallback de simulación. | Integrar y probar aparatos físicos; alertar por desconexión. | Operación |
| R4: Acceso indebido a datos personales | 2 | 5 | 10 | Sesiones httpOnly, CSRF, aislamiento por dueño y rol admin. | Revisión de accesos y política legal antes de producción. | Seguridad |
| R5: Pérdida de base de datos | 2 | 5 | 10 | Backup diario y retención 14 días declarados en Compose. | Desplegar, proteger copias externas y ensayar restauración. | Infraestructura |
| R6: Entrega incorrecta o sin evidencia | 3 | 4 | 12 | QR/firma; dron con destino, prueba GPS y confirmación. | Probar hardware y revisar reclamaciones con evidencia. | Logística |
| R7: Unidad usada sin mantenimiento | 2 | 4 | 8 | Bloqueo al 90% y por revisión vencida; bitácora. | Capacitar registro de uso y revisar umbrales. | Taller |
| R8: No disponibilidad del servidor único | 3 | 4 | 12 | Healthchecks y reinicio declarados, sin réplicas. | Medir disponibilidad y definir recuperación / redundancia. | Infraestructura |
| R9: Pasarela o correo sin configurar | 4 | 3 | 12 | Modos de prueba/manual y SMTP configurable. | Configurar servicios y probar llaves reales en sandbox. | Operación / integraciones |
| R10: Factura presentada como DIAN | 3 | 5 | 15 | La documentación diferencia factura de venta de DIAN. | Alinear textos comerciales y contratar proveedor si aplica. | Negocio / legal |

Renderizado con Mermaid CLI 12.2.0, instalado fuera de las dependencias de la aplicación. Comando equivalente por archivo: `mmdc -i archivo.mmd -o archivo.svg`.
