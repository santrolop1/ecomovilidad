# Guion de exposición — EcoMovilidad

Guion para Santiago Cabezas y Elías · 10–12 minutos, con una demo breve. La duración es orientativa; ensayar con cronómetro.

**N** muestra u oculta el guion en el HTML; flechas navegan; **F** activa pantalla completa. Las notas se muestran en la misma pantalla, no en un monitor privado.

## 1. EcoMovilidad
Expositor: Santiago Cabezas · 40 s

**Santiago Cabezas:** Buenos días. Somos Santiago Cabezas y Elías y vamos a presentar EcoMovilidad. Es una plataforma que reúne la venta y el alquiler de vehículos, la entrega de pedidos y el trabajo de operación. El objetivo no es mostrar solamente una tienda: queremos explicar cómo se conectan las decisiones del cliente con el inventario, los pagos, los domicilios y el mantenimiento. Durante la presentación distinguiremos lo que ya funciona en el software de lo que todavía requiere servicios o equipos reales.

**Acción:** Saludar y presentar a los dos expositores. Mantener el guion oculto durante la exposición si se comparte esta pantalla.

**Transición:** Primero explicamos la necesidad que resuelve.

## 2. ¿Qué problema organiza?
Expositor: Santiago Cabezas · 40 s

**Santiago Cabezas:** Pensemos en tres situaciones: un cliente compra el último vehículo disponible, otro reserva una unidad para alquilar y un administrador debe saber si un pedido fue entregado. Si cada parte se maneja por separado, es fácil ofrecer algo que ya no está disponible o perder el estado de una entrega. EcoMovilidad organiza esos flujos en un mismo sistema. La idea es que la información que consulta el cliente corresponda con lo que el administrador registra y controla.

**Transición:** Ahora veremos quién participa y qué puede hacer cada uno.

## 3. Quién usa el sistema
Expositor: Santiago Cabezas · 40 s

**Santiago Cabezas:** El sistema tiene una parte pública y una cuenta para el cliente. Desde allí se consultan productos y se hacen solicitudes de compra o alquiler. Por otro lado, el administrador entra al panel para operar el negocio. Es importante aclarar que el domiciliario todavía no cuenta con una aplicación ni un rol de acceso propio: el panel registra su avance. Además, el alcance del proyecto se concentra en Bucaramanga y los tres municipios del área metropolitana que aparecen aquí.

**Transición:** Empecemos por la parte que ve el cliente.

## 4. La experiencia del cliente
Expositor: Santiago Cabezas · 40 s

**Santiago Cabezas:** Esta es una captura real de la tienda. Desde la portada se puede entrar al catálogo o a los alquileres y consultar los puntos de servicio. La oferta está organizada en bicicletas, patinetas, patines y drones. El cliente puede revisar el detalle de cada producto y su disponibilidad. Las marcas, direcciones, sucursales y existencias que estamos mostrando son datos de demostración; por eso no deben confundirse con una operación comercial ya abierta al público.

**Acción:** Si se quiere mostrar la web, abrir la portada y una ficha de producto. No depender de una compra real.

**Transición:** Después de elegir un producto viene la compra.

## 5. Compra y pago
Expositor: Santiago Cabezas · 50 s

**Santiago Cabezas:** En una compra, agregar al carrito con una sesión activa genera una reserva temporal de inventario. Esa reserva dura quince minutos. Al crear el pedido se revisan las existencias y la franja elegida, y la reserva se transfiere sin contar el mismo stock dos veces. Después se inicia el pago. El servidor valida el resultado antes de registrar la venta y emitir la factura. Para la exposición utilizamos una pasarela simulada: no se cobra dinero real y la factura generada no es una factura electrónica validada por la DIAN.

**Acción:** En la demo usar una cuenta de prueba y la pasarela simulada.

**Transición:** El alquiler comparte el pago, pero añade reglas sobre una unidad y un periodo.

## 6. Alquiler y devolución
Expositor: Santiago Cabezas · 45 s

**Santiago Cabezas:** En el alquiler no basta con saber cuántos productos existen: necesitamos identificar una unidad concreta de la flota y el periodo que va a ocupar. La base de datos impide que dos reservas vigentes se superpongan sobre esa unidad. Una vez pagado, el administrador registra la salida en sucursal. Mientras el vehículo está afuera no se ofrece como disponible. Al devolverlo, el administrador registra la entrada y el uso en kilómetros o en horas, según el tipo de equipo.

**Transición:** La otra parte del recorrido es hacer llegar un pedido al cliente.

## 7. Entrega y evidencia
Expositor: Santiago Cabezas · 45 s

**Santiago Cabezas:** Cuando se paga un pedido con domicilio, se crea la entrega y el administrador asigna quién la llevará. El pedido pasa por los estados de recogida y tránsito hasta su validación. El cliente puede consultar un enlace de seguimiento que se actualiza cada quince segundos. En la entrega por domiciliario se pide el código del cliente o su firma. Si ocurre un fallo, se registra el motivo y se puede gestionar una reprogramación. El historial permite revisar lo ocurrido, aunque el domiciliario todavía dependa del panel para registrar su avance.

**Transición:** El domicilio con dron usa una evidencia diferente.

## 8. ¿Cómo se valida un dron?
Expositor: Santiago Cabezas · 50 s

**Santiago Cabezas:** El dron tiene un dispositivo GPS asociado y un punto de entrega. Cuando reporta la liberación, el servidor valida que la posición esté a cincuenta metros o menos del destino. Esa evidencia no marca por sí sola el pedido como entregado: el cliente puede confirmar que recibió el paquete. Después de treinta minutos se permite al administrador cerrar con la evidencia registrada, si la entrega sigue siendo válida. No existe un cierre automático por reloj. Lo que hemos probado es el flujo de software con un simulador, no la entrega de un aparato físico.

**Transición:** Le doy paso a Elías para explicar la operación interna y la tecnología.

## 9. Operación y mantenimiento
Expositor: Elías · 45 s

**Elías:** Desde la operación se consulta dónde está cada activo y qué está haciendo. Los dispositivos reportan posiciones y el panel consulta los cambios cada tres segundos. También se pueden definir zonas permitidas y revisar alertas de salida. El mantenimiento utiliza dos criterios: uso acumulado y tiempo desde la última revisión. Una unidad que llega al noventa por ciento del umbral o tiene una revisión vencida deja de ofrecerse. El uso y las revisiones los registra el administrador; no estamos suponiendo que el GPS mida automáticamente todos los kilómetros o las horas de trabajo.

**Transición:** Para conectar esas pantallas usamos tres piezas principales.

## 10. Arquitectura del software
Expositor: Elías · 50 s

**Elías:** La interfaz está construida con Next.js y React. Next.js también funciona como entrada del servidor: recibe las solicitudes del navegador y las pasa a la API cuando corresponda. FastAPI concentra las reglas de autenticación, inventario, compras, alquileres y operación. PostgreSQL conserva la información y PostGIS aporta las funciones geográficas. No son varios microservicios independientes: es un backend modular. Para la demo, la API y la base de datos permanecen privadas en la PC y se comparte solamente la web.

**Transición:** Veamos qué información permite sostener esos procesos.

## 11. Modelo de datos y reglas
Expositor: Elías · 45 s

**Elías:** Esta vista resume las relaciones principales. Un usuario puede tener pedidos; un pedido puede relacionarse con un pago, una factura y una entrega. Para alquilar diferenciamos el producto comercial de cada unidad física. El historial de la entrega se guarda aparte de su estado actual. En total hay treinta y cuatro tablas declaradas en los modelos. Algunas reglas, como evitar periodos cruzados de alquiler, se protegen también en la base de datos. El atlas de diagramas permite revisar estas relaciones con sus atributos y referencias al código.

**Transición:** La misma arquitectura puede usarse desde un celular.

## 12. Uso en Android y iPhone
Expositor: Elías · 45 s

**Elías:** No construimos dos aplicaciones separadas. La web se adapta al celular y se preparó como una PWA que puede agregarse a la pantalla de inicio. En Android se usa el menú de Chrome y en iPhone la opción de compartir de Safari. Para demostrar la instalación se necesita una dirección HTTPS. Los datos siguen viviendo en el servidor: instalar la PWA no lleva la base de datos al teléfono y no habilita operaciones sin conexión. La configuración y las vistas se verificaron en navegador; la instalación y reapertura en dispositivos físicos es una comprobación pendiente.

**Acción:** Mostrar /instalar. Si hay un teléfono disponible y un túnel HTTPS activo, seguir sus pasos sin afirmar una instalación que no se haya probado.

**Transición:** Además de las pantallas, verificamos reglas con pruebas.

## 13. Calidad y documentación
Expositor: Elías · 40 s

**Elías:** Para la versión revisada tenemos ciento seis pruebas de frontend y doscientas cuarenta y dos de backend. El CI de main ejecuta además la revisión de tipos, lint, build, comprobaciones de migraciones y búsqueda de secretos. La documentación incluye los diagramas de análisis, arquitectura, datos y comportamiento, con cinco ampliaciones del DER. Estas comprobaciones ayudan a detectar regresiones, pero no equivalen a afirmar que el sistema sea infalible o que ya se haya probado con todos los servicios reales. Las cifras corresponden al commit indicado en la diapositiva.

**Transición:** Con esa base, proponemos este recorrido para la demostración.

## 14. Recorrido de demostración
Expositor: Santiago Cabezas y Elías · 90 s

**Santiago Cabezas:** Ahora vamos a recorrer una compra con una cuenta de prueba. Primero elegimos un producto y revisamos su disponibilidad. Después creamos el pedido y usamos el pago simulado. Mostraremos el resultado y cómo consulta el cliente el avance. No vamos a introducir datos de tarjeta ni a hacer un cobro real.

**Elías:** Desde el panel mostraré cómo se relaciona ese pedido con la operación. También podemos abrir un alquiler para señalar los registros de salida y entrada y la revisión de mantenimiento. Por último enseñaré la página de instalación móvil. Si no tenemos el backend o el túnel disponibles, usaremos las capturas y diremos claramente que estamos explicando el flujo, sin presentarlo como una operación en vivo.

**Acción:** Antes de exponer: levantar Docker, API y web en modo real; preparar cuentas y datos. Mantener las ventanas listas. Consultar docs/DEMO_MOVIL_WINDOWS.md. La tienda mock por sí sola no demuestra el backend.

**Transición:** Cerramos mostrando con claridad qué sigue pendiente.

## 15. Estado y próximos pasos
Expositor: Elías · 45 s

**Elías:** El estado actual es una demostración funcional, no un servicio publicado en producción. Para operar de verdad faltan el servidor estable, los servicios de correo y pago configurados y la validación con equipos físicos. La factura todavía no tiene validación DIAN y no hay roles independientes para operador y domiciliario. También dejamos documentado un riesgo de concurrencia al asignar el mismo dron a dos entregas a la vez. Y algo importante: el desbloqueo remoto aparece como propuesta de diseño, pero no es una función implementada que podamos demostrar.

**Transición:** Retomamos el objetivo con el que empezamos.

## 16. Cierre y preguntas
Expositor: Santiago Cabezas y Elías · 35 s

**Santiago Cabezas:** Como conclusión, EcoMovilidad reúne la experiencia del cliente y los procesos que hacen posible atenderla. La compra, el alquiler y la entrega se relacionan con inventario, pagos y seguimiento.

**Elías:** La arquitectura permite usar la misma web desde escritorio o celular y mantener las reglas en el servidor. La documentación y las pruebas dejan una base para continuar, con las limitaciones que acabamos de explicar. Muchas gracias. Podemos revisar el flujo o el componente que les interese.

**Acción:** En preguntas, abrir el diagrama o la sección del README que respalde la respuesta. No afirmar una integración física ni una función pendiente.
