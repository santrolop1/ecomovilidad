# Diccionario de datos derivado del código

34 tablas extraídas estáticamente de las clases SQLAlchemy; sin conexión a base de datos.

Los tipos son anotaciones Python; consultar cada modelo para precisión SQL, CHECK, índices, valores por defecto y restricciones compuestas. No se ha comparado esta extracción con una base desplegada.

## `rental_rates` — RentalRate

Fuente: [backend/app/modules/alquiler/models.py](../../backend/app/modules/alquiler/models.py) (línea 36).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `product_id` | uuid | No | FK → products.id |
| `unit` | str | No | — |
| `price` | int | No | — |

## `rental_units` — RentalUnit

Fuente: [backend/app/modules/alquiler/models.py](../../backend/app/modules/alquiler/models.py) (línea 51).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `product_id` | uuid | No | FK → products.id |
| `branch_id` | uuid | No | FK → branches.id |
| `code` | str | No | Única simple |
| `status` | str | No | — |
| `is_demo` | bool | No | — |
| `usage_unit` | str | No | — |
| `usage_value` | Decimal | No | — |
| `service_threshold` | int | No | — |
| `service_interval_days` | int | No | — |
| `last_service_at` | datetime | No | — |

## `maintenance_logs` — MaintenanceLog

Fuente: [backend/app/modules/alquiler/models.py](../../backend/app/modules/alquiler/models.py) (línea 82).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `unit_id` | uuid | No | FK → rental_units.id |
| `kind` | str | No | — |
| `usage_delta` | Decimal | Sí | — |
| `usage_after` | Decimal | No | — |
| `note` | str | Sí | — |
| `user_id` | uuid | Sí | FK → users.id |
| `created_at` | datetime | No | — |

## `rentals` — Rental

Fuente: [backend/app/modules/alquiler/models.py](../../backend/app/modules/alquiler/models.py) (línea 99).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `user_id` | uuid | No | FK → users.id |
| `product_id` | uuid | No | FK → products.id |
| `branch_id` | uuid | No | FK → branches.id |
| `rental_unit_id` | uuid | Sí | FK → rental_units.id |
| `start_at` | datetime | No | — |
| `end_at` | datetime | No | — |
| `period` | tstzrange | No | — |
| `status` | str | No | — |
| `price` | int | No | — |
| `payment_expires_at` | datetime | Sí | — |
| `contact_name` | str | Sí | — |
| `contact_email` | str | Sí | — |
| `contact_phone` | str | Sí | — |
| `document_type` | str | Sí | — |
| `document_number` | str | Sí | — |
| `checked_out_at` | datetime | Sí | — |
| `checked_out_by` | uuid | Sí | FK → users.id |
| `returned_at` | datetime | Sí | — |
| `returned_by` | uuid | Sí | FK → users.id |
| `return_usage` | Decimal | Sí | — |

## `users` — User

Fuente: [backend/app/modules/autenticacion/models.py](../../backend/app/modules/autenticacion/models.py) (línea 12).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `email` | str | No | Única simple |
| `password_hash` | str | No | — |
| `first_name` | str | No | — |
| `last_name` | str | No | — |
| `phone` | str | No | — |
| `document_number` | str | Sí | — |
| `is_active` | bool | No | — |
| `is_admin` | bool | No | — |

## `user_sessions` — UserSession

Fuente: [backend/app/modules/autenticacion/models.py](../../backend/app/modules/autenticacion/models.py) (línea 29).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `user_id` | uuid | No | FK → users.id |
| `token_hash` | str | No | Única simple |
| `csrf_token_hash` | str | No | — |
| `expires_at` | datetime | No | — |
| `created_at` | datetime | No | — |

## `password_reset_tokens` — PasswordResetToken

Fuente: [backend/app/modules/autenticacion/security_records.py](../../backend/app/modules/autenticacion/security_records.py) (línea 16).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `user_id` | uuid | No | FK → users.id |
| `token_hash` | str | No | Única simple |
| `expires_at` | datetime | No | — |
| `used_at` | datetime | Sí | — |
| `created_at` | datetime | No | — |

## `login_attempts` — LoginAttempt

Fuente: [backend/app/modules/autenticacion/security_records.py](../../backend/app/modules/autenticacion/security_records.py) (línea 28).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `email_hash` | str | No | — |
| `ip_address` | str | No | — |
| `succeeded` | bool | No | — |
| `created_at` | datetime | No | — |

## `consent_records` — ConsentRecord

Fuente: [backend/app/modules/autenticacion/security_records.py](../../backend/app/modules/autenticacion/security_records.py) (línea 46).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `user_id` | uuid | No | FK → users.id |
| `purpose` | str | No | — |
| `policy_version` | str | No | — |
| `order_id` | uuid | Sí | FK → orders.id |
| `rental_id` | uuid | Sí | FK → rentals.id |
| `accepted_at` | datetime | No | — |

## `carts` — Cart

Fuente: [backend/app/modules/carrito/models.py](../../backend/app/modules/carrito/models.py) (línea 19).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `user_id` | uuid | No | FK → users.id |
| `status` | str | No | — |

## `cart_items` — CartItem

Fuente: [backend/app/modules/carrito/models.py](../../backend/app/modules/carrito/models.py) (línea 37).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `cart_id` | uuid | No | FK → carts.id |
| `product_id` | uuid | No | FK → products.id |
| `quantity` | int | No | — |
| `unit_price` | int | No | — |

## `categories` — Category

Fuente: [backend/app/modules/catalogo/models.py](../../backend/app/modules/catalogo/models.py) (línea 16).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `name` | str | No | Única simple |
| `slug` | str | No | Única simple |
| `description` | str | No | — |

## `products` — Product

Fuente: [backend/app/modules/catalogo/models.py](../../backend/app/modules/catalogo/models.py) (línea 26).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `category_id` | uuid | No | FK → categories.id |
| `name` | str | No | — |
| `slug` | str | No | Única simple |
| `sku` | str | No | Única simple |
| `short_description` | str | No | — |
| `description` | str | No | — |
| `brand` | str | No | — |
| `price` | int | No | — |
| `compare_at_price` | int | Sí | — |
| `specifications` | json | No | — |
| `highlights` | json | No | — |
| `image_url` | str | Sí | — |
| `is_featured` | bool | No | — |
| `is_active` | bool | No | — |

## `contact_messages` — ContactMessage

Fuente: [backend/app/modules/contacto/models.py](../../backend/app/modules/contacto/models.py) (línea 11).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `full_name` | str | No | — |
| `email` | str | No | — |
| `phone` | str | Sí | — |
| `topic` | str | No | — |
| `message` | str | No | — |
| `status` | str | No | — |
| `policy_version` | str | No | — |
| `ip_hash` | str | Sí | — |
| `created_at` | datetime | No | — |

## `value_propositions` — ValueProposition

Fuente: [backend/app/modules/contenidos/models.py](../../backend/app/modules/contenidos/models.py) (línea 13).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `title` | str | No | — |
| `description` | str | No | — |
| `icon` | str | No | — |
| `position` | int | No | — |
| `is_active` | bool | No | — |

## `banners` — Banner

Fuente: [backend/app/modules/contenidos/models.py](../../backend/app/modules/contenidos/models.py) (línea 23).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `title` | str | No | — |
| `description` | str | No | — |
| `cta_label` | str | No | — |
| `cta_href` | str | No | — |
| `starts_at` | datetime | No | — |
| `ends_at` | datetime | No | — |
| `is_active` | bool | No | — |

## `news_items` — NewsItem

Fuente: [backend/app/modules/contenidos/models.py](../../backend/app/modules/contenidos/models.py) (línea 38).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `slug` | str | No | Única simple |
| `title` | str | No | — |
| `excerpt` | str | No | — |
| `published_at` | datetime | No | — |
| `is_published` | bool | No | — |

## `couriers` — Courier

Fuente: [backend/app/modules/domicilios/models.py](../../backend/app/modules/domicilios/models.py) (línea 19).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `name` | str | No | — |
| `phone` | str | No | — |
| `is_active` | bool | No | — |

## `deliveries` — Delivery

Fuente: [backend/app/modules/domicilios/models.py](../../backend/app/modules/domicilios/models.py) (línea 29).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `order_id` | uuid | No | FK → orders.id |
| `courier_id` | uuid | Sí | FK → couriers.id |
| `status` | str | No | — |
| `tracking_token` | str | No | Única simple |
| `confirmation_code` | str | No | — |
| `proof_method` | str | Sí | — |
| `signer_name` | str | Sí | — |
| `signature_image` | str | Sí | — |
| `failure_reason` | str | Sí | — |
| `delivered_at` | datetime | Sí | — |
| `carrier` | str | No | — |
| `drone_device_id` | uuid | Sí | FK → gps_devices.id |
| `destination_latitude` | Decimal | Sí | — |
| `destination_longitude` | Decimal | Sí | — |
| `drop_latitude` | Decimal | Sí | — |
| `drop_longitude` | Decimal | Sí | — |
| `drop_distance_m` | int | Sí | — |
| `dropped_at` | datetime | Sí | — |
| `customer_confirmed_at` | datetime | Sí | — |

## `delivery_events` — DeliveryEvent

Fuente: [backend/app/modules/domicilios/models.py](../../backend/app/modules/domicilios/models.py) (línea 89).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `delivery_id` | uuid | No | FK → deliveries.id |
| `status` | str | No | — |
| `note` | str | Sí | — |
| `user_id` | uuid | Sí | FK → users.id |
| `created_at` | datetime | No | — |

## `inventory` — Inventory

Fuente: [backend/app/modules/inventario/models.py](../../backend/app/modules/inventario/models.py) (línea 18).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `product_id` | uuid | No | FK → products.id |
| `branch_id` | uuid | No | FK → branches.id |
| `available_quantity` | int | No | — |
| `reserved_quantity` | int | No | — |
| `total_quantity` | int | No | — |
| `updated_at` | datetime | No | — |

## `inventory_movements` — InventoryMovement

Fuente: [backend/app/modules/inventario/models.py](../../backend/app/modules/inventario/models.py) (línea 47).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `inventory_id` | uuid | No | FK → inventory.id |
| `kind` | str | No | — |
| `quantity` | int | No | — |
| `balance_after` | int | No | — |
| `reason` | str | Sí | — |
| `order_id` | uuid | Sí | FK → orders.id |
| `user_id` | uuid | Sí | FK → users.id |
| `created_at` | datetime | No | — |

## `cart_reservations` — CartReservation

Fuente: [backend/app/modules/inventario/reservation_models.py](../../backend/app/modules/inventario/reservation_models.py) (línea 19).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `cart_item_id` | uuid | No | FK → cart_items.id |
| `inventory_id` | uuid | No | FK → inventory.id |
| `quantity` | int | No | — |
| `expires_at` | datetime | No | — |
| `created_at` | datetime | No | — |

## `payments` — Payment

Fuente: [backend/app/modules/pagos/models.py](../../backend/app/modules/pagos/models.py) (línea 29).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `user_id` | uuid | No | FK → users.id |
| `order_id` | uuid | Sí | FK → orders.id |
| `rental_id` | uuid | Sí | FK → rentals.id |
| `provider` | str | No | — |
| `reference` | str | No | Única simple |
| `amount_in_cents` | int | No | — |
| `currency` | str | No | — |
| `status` | str | No | — |
| `provider_transaction_id` | str | Sí | Única simple |
| `payment_method_type` | str | Sí | — |
| `status_message` | str | Sí | — |
| `requires_refund` | bool | No | — |
| `approved_at` | datetime | Sí | — |

## `payment_events` — PaymentEvent

Fuente: [backend/app/modules/pagos/models.py](../../backend/app/modules/pagos/models.py) (línea 73).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `checksum` | str | No | Única simple |
| `event` | str | No | — |
| `transaction_id` | str | Sí | — |
| `status` | str | Sí | — |
| `payload` | json | No | — |
| `received_at` | datetime | No | — |

## `invoices` — Invoice

Fuente: [backend/app/modules/pagos/models.py](../../backend/app/modules/pagos/models.py) (línea 87).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `number` | int | No | Única simple |
| `prefix` | str | No | — |
| `payment_id` | uuid | No | FK → payments.id |
| `order_id` | uuid | Sí | FK → orders.id |
| `rental_id` | uuid | Sí | FK → rentals.id |
| `user_id` | uuid | No | FK → users.id |
| `buyer_name` | str | No | — |
| `buyer_document_type` | str | No | — |
| `buyer_document_number` | str | No | — |
| `buyer_email` | str | No | — |
| `subtotal` | int | No | — |
| `vat` | int | No | — |
| `total` | int | No | — |
| `pdf` | bytes | No | — |
| `xml` | str | No | — |
| `issued_at` | datetime | No | — |

## `refund_requests` — RefundRequest

Fuente: [backend/app/modules/pagos/models.py](../../backend/app/modules/pagos/models.py) (línea 123).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `user_id` | uuid | No | FK → users.id |
| `order_id` | uuid | Sí | FK → orders.id |
| `rental_id` | uuid | Sí | FK → rentals.id |
| `reason` | str | No | — |
| `status` | str | No | — |
| `created_at` | datetime | No | — |
| `resolved_at` | datetime | Sí | — |

## `orders` — Order

Fuente: [backend/app/modules/pedidos/models.py](../../backend/app/modules/pedidos/models.py) (línea 19).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `user_id` | uuid | No | FK → users.id |
| `status` | str | No | — |
| `subtotal` | int | No | — |
| `shipping_cost` | int | No | — |
| `total` | int | No | — |
| `branch_id` | uuid | No | FK → branches.id |
| `fulfillment_method` | str | No | — |
| `delivery_address` | str | Sí | — |
| `delivery_city` | str | Sí | — |
| `scheduled_date` | date | No | — |
| `time_slot` | str | No | — |
| `payment_method` | str | Sí | — |
| `payment_expires_at` | datetime | Sí | — |
| `stock_settled_at` | datetime | Sí | — |
| `contact_name` | str | No | — |
| `contact_email` | str | No | — |
| `contact_phone` | str | No | — |
| `document_type` | str | No | — |
| `document_number` | str | No | — |

## `order_items` — OrderItem

Fuente: [backend/app/modules/pedidos/models.py](../../backend/app/modules/pedidos/models.py) (línea 71).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `order_id` | uuid | No | FK → orders.id |
| `product_id` | uuid | No | FK → products.id |
| `quantity` | int | No | — |
| `unit_price` | int | No | — |
| `subtotal` | int | No | — |

## `branches` — Branch

Fuente: [backend/app/modules/sucursales/models.py](../../backend/app/modules/sucursales/models.py) (línea 18).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `slug` | str | No | Única simple |
| `name` | str | No | — |
| `address` | str | No | — |
| `neighborhood` | str | No | — |
| `city` | str | No | — |
| `phone` | str | No | — |
| `latitude` | Decimal | No | — |
| `longitude` | Decimal | No | — |
| `location` | geography | No | — |
| `opening_hours` | json | No | — |
| `services` | json | No | — |
| `slot_capacity` | int | No | — |
| `is_demo` | bool | No | — |
| `is_active` | bool | No | — |

## `gps_devices` — GpsDevice

Fuente: [backend/app/modules/telemetria/models.py](../../backend/app/modules/telemetria/models.py) (línea 28).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `code` | str | No | Única simple |
| `kind` | str | No | — |
| `token_hash` | str | No | Única simple |
| `branch_id` | uuid | Sí | FK → branches.id |
| `courier_id` | uuid | Sí | FK → couriers.id |
| `rental_unit_id` | uuid | Sí | FK → rental_units.id |
| `is_active` | bool | No | — |
| `last_latitude` | Decimal | Sí | — |
| `last_longitude` | Decimal | Sí | — |
| `last_battery_pct` | int | Sí | — |
| `last_seen_at` | datetime | Sí | — |

## `gps_positions` — GpsPosition

Fuente: [backend/app/modules/telemetria/models.py](../../backend/app/modules/telemetria/models.py) (línea 52).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `device_id` | uuid | No | FK → gps_devices.id |
| `latitude` | Decimal | No | — |
| `longitude` | Decimal | No | — |
| `battery_pct` | int | Sí | — |
| `recorded_at` | datetime | No | — |

## `geofences` — Geofence

Fuente: [backend/app/modules/telemetria/models.py](../../backend/app/modules/telemetria/models.py) (línea 65).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `created_at` | datetime | No | — |
| `updated_at` | datetime | No | — |
| `name` | str | No | Única simple |
| `latitude` | Decimal | No | — |
| `longitude` | Decimal | No | — |
| `radius_m` | int | No | — |
| `is_active` | bool | No | — |
| `location` | geography | No | — |

## `geofence_alerts` — GeofenceAlert

Fuente: [backend/app/modules/telemetria/models.py](../../backend/app/modules/telemetria/models.py) (línea 85).

| Columna | Tipo lógico | Nulo | Clave / referencia |
|---|---|---|---|
| `id` | uuid | No | PK |
| `device_id` | uuid | No | FK → gps_devices.id |
| `latitude` | Decimal | No | — |
| `longitude` | Decimal | No | — |
| `opened_at` | datetime | No | — |
| `closed_at` | datetime | Sí | — |

## Restricciones que no se reducen a cardinalidades

- `rentals`: exclusión GiST de periodos solapados en pending, confirmed y active.
- `inventory`: combinación producto-sucursal única; cantidades no negativas.
- `carts`: índice parcial para un carrito activo por usuario.
- `payments`, `invoices`, `refund_requests`: destino pedido o alquiler sujeto a CHECK; revisar reglas del modelo.
- `deliveries`: un domicilio por pedido; prueba obligatoria si entregado; dron y domiciliario son alternativas.
- `geofence_alerts`: índice parcial que permite solo una alerta abierta por dispositivo.
- `maintenance_logs`: inmutabilidad aplicada por trigger en migraciones.
- Índices y restricciones compuestas deben consultarse en modelos y Alembic, no se marcan como UK por columna individual.
