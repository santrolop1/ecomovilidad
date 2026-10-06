"""Esquema inicial: usuarios, sesiones, catálogo, sucursales (PostGIS), inventario,
carrito, pedidos y alquiler.

Revision ID: 0001
Revises:
Create Date: 2026-10-06 01:22:52.989989
"""

from collections.abc import Sequence

import sqlalchemy as sa
from geoalchemy2 import Geography
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # PostGIS: tipos geography/geometry y funciones espaciales.
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_geospatial_table(
        "branches",
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("address", sa.String(length=160), nullable=False),
        sa.Column("neighborhood", sa.String(length=80), nullable=False),
        sa.Column("city", sa.String(length=40), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column(
            "location",
            Geography(
                geometry_type="POINT",
                srid=4326,
                dimension=2,
                spatial_index=False,
                from_text="ST_GeogFromText",
                name="geography",
                nullable=False,
            ),
            sa.Computed(
                "ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geography", persisted=True
            ),
            nullable=False,
        ),
        sa.Column("opening_hours", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
        sa.Column("services", postgresql.ARRAY(sa.String(length=20)), server_default="{}", nullable=False),
        sa.Column("is_demo", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "city IN ('Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta')",
            name=op.f("ck_branches_city_in_service_area"),
        ),
        sa.CheckConstraint(
            "services <@ ARRAY['venta', 'alquiler', 'mantenimiento', 'recogida', 'devolucion']::varchar[]",
            name=op.f("ck_branches_known_services"),
        ),
        sa.CheckConstraint(
            "latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180", name=op.f("ck_branches_valid_coordinates")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_branches")),
        sa.UniqueConstraint("slug", name=op.f("uq_branches_slug")),
    )
    op.create_geospatial_index(
        "ix_branches_location", "branches", ["location"], unique=False, postgresql_using="gist", postgresql_ops={}
    )
    op.create_table(
        "categories",
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("slug", sa.String(length=60), nullable=False),
        sa.Column("description", sa.Text(), server_default="", nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_categories")),
        sa.UniqueConstraint("name", name=op.f("uq_categories_name")),
        sa.UniqueConstraint("slug", name=op.f("uq_categories_slug")),
    )
    op.create_table(
        "users",
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("first_name", sa.String(length=80), nullable=False),
        sa.Column("last_name", sa.String(length=80), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("document_number", sa.String(length=20), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("email = lower(email)", name=op.f("ck_users_email_lowercase")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )
    op.create_table(
        "carts",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("status IN ('active', 'converted', 'abandoned')", name=op.f("ck_carts_valid_status")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_carts_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_carts")),
    )
    op.create_index(op.f("ix_carts_user_id"), "carts", ["user_id"], unique=False)
    op.create_index(
        "uq_carts_one_active_per_user", "carts", ["user_id"], unique=True, postgresql_where=sa.text("status = 'active'")
    )
    op.create_table(
        "orders",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("subtotal", sa.BigInteger(), nullable=False),
        sa.Column("shipping_cost", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("total", sa.BigInteger(), nullable=False),
        sa.Column("branch_id", sa.UUID(), nullable=False),
        sa.Column("fulfillment_method", sa.String(length=20), nullable=False),
        sa.Column("delivery_address", sa.String(length=160), nullable=True),
        sa.Column("delivery_city", sa.String(length=40), nullable=True),
        sa.Column("scheduled_date", sa.Date(), nullable=False),
        sa.Column("time_slot", sa.String(length=20), nullable=False),
        sa.Column("payment_method", sa.String(length=20), nullable=False),
        sa.Column("contact_name", sa.String(length=160), nullable=False),
        sa.Column("contact_email", sa.String(length=254), nullable=False),
        sa.Column("contact_phone", sa.String(length=20), nullable=False),
        sa.Column("document_type", sa.String(length=3), nullable=False),
        sa.Column("document_number", sa.String(length=20), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "fulfillment_method <> 'domicilio' OR (delivery_address IS NOT NULL AND delivery_city IN ('Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta'))",
            name=op.f("ck_orders_delivery_inside_service_area"),
        ),
        sa.CheckConstraint("fulfillment_method IN ('domicilio', 'recogida')", name=op.f("ck_orders_valid_fulfillment")),
        sa.CheckConstraint(
            "payment_method IN ('pse', 'tarjeta', 'billetera')", name=op.f("ck_orders_valid_payment_method")
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'confirmed', 'cancelled', 'completed')", name=op.f("ck_orders_valid_status")
        ),
        sa.CheckConstraint("subtotal >= 0 AND shipping_cost >= 0", name=op.f("ck_orders_amounts_non_negative")),
        sa.CheckConstraint("total = subtotal + shipping_cost", name=op.f("ck_orders_total_consistent")),
        sa.ForeignKeyConstraint(
            ["branch_id"], ["branches.id"], name=op.f("fk_orders_branch_id_branches"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_orders_user_id_users"), ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_orders")),
    )
    op.create_index(op.f("ix_orders_user_id"), "orders", ["user_id"], unique=False)
    op.create_table(
        "products",
        sa.Column("category_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("sku", sa.String(length=40), nullable=False),
        sa.Column("short_description", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("brand", sa.String(length=80), nullable=False),
        sa.Column("price", sa.BigInteger(), nullable=False),
        sa.Column("compare_at_price", sa.BigInteger(), nullable=True),
        sa.Column("specifications", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
        sa.Column("highlights", postgresql.ARRAY(sa.String(length=80)), server_default="{}", nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=False),
        sa.Column("is_featured", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("jsonb_typeof(specifications) = 'array'", name=op.f("ck_products_specifications_is_array")),
        sa.CheckConstraint(
            "compare_at_price IS NULL OR compare_at_price > price", name=op.f("ck_products_compare_at_above_price")
        ),
        sa.CheckConstraint("price >= 0", name=op.f("ck_products_price_non_negative")),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], name=op.f("fk_products_category_id_categories"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_products")),
        sa.UniqueConstraint("sku", name=op.f("uq_products_sku")),
        sa.UniqueConstraint("slug", name=op.f("uq_products_slug")),
    )
    op.create_index(op.f("ix_products_brand"), "products", ["brand"], unique=False)
    op.create_index(op.f("ix_products_category_id"), "products", ["category_id"], unique=False)
    op.create_index(op.f("ix_products_is_active"), "products", ["is_active"], unique=False)
    op.create_table(
        "user_sessions",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("csrf_token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_user_sessions_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_sessions")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_user_sessions_token_hash")),
    )
    op.create_index(op.f("ix_user_sessions_expires_at"), "user_sessions", ["expires_at"], unique=False)
    op.create_index(op.f("ix_user_sessions_user_id"), "user_sessions", ["user_id"], unique=False)
    op.create_table(
        "cart_items",
        sa.Column("cart_id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.BigInteger(), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("quantity BETWEEN 1 AND 10", name=op.f("ck_cart_items_quantity_range")),
        sa.CheckConstraint("unit_price >= 0", name=op.f("ck_cart_items_unit_price_non_negative")),
        sa.ForeignKeyConstraint(
            ["cart_id"], ["carts.id"], name=op.f("fk_cart_items_cart_id_carts"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["product_id"], ["products.id"], name=op.f("fk_cart_items_product_id_products"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_cart_items")),
        sa.UniqueConstraint("cart_id", "product_id", name="uq_cart_items_cart_product"),
    )
    op.create_table(
        "inventory",
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("branch_id", sa.UUID(), nullable=False),
        sa.Column("available_quantity", sa.Integer(), server_default="0", nullable=False),
        sa.Column("reserved_quantity", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_quantity", sa.Integer(), server_default="0", nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.CheckConstraint(
            "available_quantity + reserved_quantity <= total_quantity", name=op.f("ck_inventory_quantities_consistent")
        ),
        sa.CheckConstraint("available_quantity >= 0", name=op.f("ck_inventory_available_non_negative")),
        sa.CheckConstraint("reserved_quantity >= 0", name=op.f("ck_inventory_reserved_non_negative")),
        sa.CheckConstraint("total_quantity >= 0", name=op.f("ck_inventory_total_non_negative")),
        sa.ForeignKeyConstraint(
            ["branch_id"], ["branches.id"], name=op.f("fk_inventory_branch_id_branches"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["product_id"], ["products.id"], name=op.f("fk_inventory_product_id_products"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_inventory")),
        sa.UniqueConstraint("product_id", "branch_id", name="uq_inventory_product_branch"),
    )
    op.create_index(op.f("ix_inventory_branch_id"), "inventory", ["branch_id"], unique=False)
    op.create_table(
        "order_items",
        sa.Column("order_id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.BigInteger(), nullable=False),
        sa.Column("subtotal", sa.BigInteger(), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.CheckConstraint("quantity > 0", name=op.f("ck_order_items_quantity_positive")),
        sa.CheckConstraint("subtotal = quantity * unit_price", name=op.f("ck_order_items_subtotal_consistent")),
        sa.CheckConstraint("unit_price >= 0", name=op.f("ck_order_items_unit_price_non_negative")),
        sa.ForeignKeyConstraint(
            ["order_id"], ["orders.id"], name=op.f("fk_order_items_order_id_orders"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["product_id"], ["products.id"], name=op.f("fk_order_items_product_id_products"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_order_items")),
        sa.UniqueConstraint("order_id", "product_id", name="uq_order_items_order_product"),
    )
    op.create_index(op.f("ix_order_items_order_id"), "order_items", ["order_id"], unique=False)
    op.create_table(
        "rentals",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("branch_id", sa.UUID(), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("price", sa.BigInteger(), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')",
            name=op.f("ck_rentals_valid_status"),
        ),
        sa.CheckConstraint("end_at > start_at", name=op.f("ck_rentals_end_after_start")),
        sa.CheckConstraint("price >= 0", name=op.f("ck_rentals_price_non_negative")),
        sa.ForeignKeyConstraint(
            ["branch_id"], ["branches.id"], name=op.f("fk_rentals_branch_id_branches"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["product_id"], ["products.id"], name=op.f("fk_rentals_product_id_products"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_rentals_user_id_users"), ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_rentals")),
    )
    op.create_index(op.f("ix_rentals_user_id"), "rentals", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_rentals_user_id"), table_name="rentals")
    op.drop_table("rentals")
    op.drop_index(op.f("ix_order_items_order_id"), table_name="order_items")
    op.drop_table("order_items")
    op.drop_index(op.f("ix_inventory_branch_id"), table_name="inventory")
    op.drop_table("inventory")
    op.drop_table("cart_items")
    op.drop_index(op.f("ix_user_sessions_user_id"), table_name="user_sessions")
    op.drop_index(op.f("ix_user_sessions_expires_at"), table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_index(op.f("ix_products_is_active"), table_name="products")
    op.drop_index(op.f("ix_products_category_id"), table_name="products")
    op.drop_index(op.f("ix_products_brand"), table_name="products")
    op.drop_table("products")
    op.drop_index(op.f("ix_orders_user_id"), table_name="orders")
    op.drop_table("orders")
    op.drop_index("uq_carts_one_active_per_user", table_name="carts", postgresql_where=sa.text("status = 'active'"))
    op.drop_index(op.f("ix_carts_user_id"), table_name="carts")
    op.drop_table("carts")
    op.drop_table("users")
    op.drop_table("categories")
    op.drop_geospatial_index(
        "ix_branches_location", table_name="branches", postgresql_using="gist", column_name="location"
    )
    op.drop_geospatial_table("branches")
