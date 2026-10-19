"""Pagos en línea (Wompi), facturas de venta y flota de alquiler.

- `payments`, `payment_events`, `invoices` y la secuencia `invoice_number_seq`.
- Pedidos: estado `paid`, plazo de pago, momento en que se descontó el
  inventario y medio de pago opcional (ahora se elige en la pasarela).
- Alquiler: tarifas (`rental_rates`), unidades físicas (`rental_units`) y, en
  `rentals`, la unidad asignada, el periodo como rango y una restricción de
  exclusión que impide dos alquileres vigentes cruzados sobre la misma unidad.
- Consentimiento (Ley 1581) también para alquileres.

Nota de datos: los pedidos `pending` anteriores reciben 24 horas para pagarse;
después se cancelan solos y liberan su inventario.

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-19 16:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ORDER_STATUSES_OLD = "('pending', 'confirmed', 'cancelled', 'completed')"
ORDER_STATUSES_NEW = "('pending', 'paid', 'confirmed', 'cancelled', 'completed')"
PAYMENT_METHODS = "('pse', 'tarjeta', 'billetera')"
ONE_TARGET = "(order_id IS NOT NULL) <> (rental_id IS NOT NULL)"


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

    # ── Pedidos ──────────────────────────────────────────────────────────────
    op.drop_constraint(op.f("ck_orders_valid_status"), "orders", type_="check")
    op.create_check_constraint("valid_status", "orders", f"status IN {ORDER_STATUSES_NEW}")
    op.drop_constraint(op.f("ck_orders_valid_payment_method"), "orders", type_="check")
    op.alter_column("orders", "payment_method", existing_type=sa.String(length=20), nullable=True)
    op.create_check_constraint(
        "valid_payment_method", "orders", f"payment_method IS NULL OR payment_method IN {PAYMENT_METHODS}"
    )
    op.add_column("orders", sa.Column("payment_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("orders", sa.Column("stock_settled_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE orders SET payment_expires_at = now() + interval '24 hours' WHERE status = 'pending'")

    # ── Flota de alquiler ────────────────────────────────────────────────────
    op.create_table(
        "rental_rates",
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("unit", sa.String(length=10), nullable=False),
        sa.Column("price", sa.BigInteger(), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.CheckConstraint("price > 0", name=op.f("ck_rental_rates_price_positive")),
        sa.CheckConstraint("unit IN ('hora', 'dia')", name=op.f("ck_rental_rates_valid_unit")),
        sa.ForeignKeyConstraint(
            ["product_id"], ["products.id"], name=op.f("fk_rental_rates_product_id_products"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_rental_rates")),
        sa.UniqueConstraint("product_id", "unit", name="uq_rental_rates_product_unit"),
    )
    op.create_index(op.f("ix_rental_rates_product_id"), "rental_rates", ["product_id"], unique=False)

    op.create_table(
        "rental_units",
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("branch_id", sa.UUID(), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="operativo", nullable=False),
        sa.Column("is_demo", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('operativo', 'mantenimiento', 'retirado')", name=op.f("ck_rental_units_valid_status")
        ),
        sa.ForeignKeyConstraint(
            ["branch_id"], ["branches.id"], name=op.f("fk_rental_units_branch_id_branches"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["product_id"], ["products.id"], name=op.f("fk_rental_units_product_id_products"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_rental_units")),
        sa.UniqueConstraint("code", name=op.f("uq_rental_units_code")),
    )
    op.create_index(op.f("ix_rental_units_branch_id"), "rental_units", ["branch_id"], unique=False)
    op.create_index(op.f("ix_rental_units_product_id"), "rental_units", ["product_id"], unique=False)

    op.add_column("rentals", sa.Column("rental_unit_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        op.f("fk_rentals_rental_unit_id_rental_units"),
        "rentals",
        "rental_units",
        ["rental_unit_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.add_column(
        "rentals",
        sa.Column(
            "period",
            postgresql.TSTZRANGE(),
            sa.Computed("tstzrange(start_at, GREATEST(start_at, end_at), '[)')", persisted=True),
            nullable=True,
        ),
    )
    op.add_column("rentals", sa.Column("payment_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("rentals", sa.Column("contact_name", sa.String(length=160), nullable=True))
    op.add_column("rentals", sa.Column("contact_email", sa.String(length=254), nullable=True))
    op.add_column("rentals", sa.Column("contact_phone", sa.String(length=20), nullable=True))
    op.add_column("rentals", sa.Column("document_type", sa.String(length=3), nullable=True))
    op.add_column("rentals", sa.Column("document_number", sa.String(length=20), nullable=True))
    op.create_exclude_constraint(
        "rentals_no_overlap",
        "rentals",
        ("rental_unit_id", "="),
        ("period", "&&"),
        using="gist",
        where="status IN ('pending', 'confirmed', 'active')",
    )

    # ── Consentimiento para alquileres ───────────────────────────────────────
    op.add_column("consent_records", sa.Column("rental_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        op.f("fk_consent_records_rental_id_rentals"),
        "consent_records",
        "rentals",
        ["rental_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.drop_constraint(op.f("ck_consent_records_valid_purpose"), "consent_records", type_="check")
    op.create_check_constraint("valid_purpose", "consent_records", "purpose IN ('registro', 'pedido', 'alquiler')")
    op.create_check_constraint(
        "rental_consent_has_rental", "consent_records", "purpose <> 'alquiler' OR rental_id IS NOT NULL"
    )

    # ── Pagos y facturas ─────────────────────────────────────────────────────
    op.create_table(
        "payments",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("order_id", sa.UUID(), nullable=True),
        sa.Column("rental_id", sa.UUID(), nullable=True),
        sa.Column("provider", sa.String(length=20), server_default="wompi", nullable=False),
        sa.Column("reference", sa.String(length=64), nullable=False),
        sa.Column("amount_in_cents", sa.BigInteger(), nullable=False),
        sa.Column("currency", sa.String(length=3), server_default="COP", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("provider_transaction_id", sa.String(length=64), nullable=True),
        sa.Column("payment_method_type", sa.String(length=40), nullable=True),
        sa.Column("status_message", sa.String(length=255), nullable=True),
        sa.Column("requires_refund", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("amount_in_cents > 0", name=op.f("ck_payments_amount_positive")),
        sa.CheckConstraint(ONE_TARGET, name=op.f("ck_payments_one_target")),
        sa.CheckConstraint(
            "status IN ('pending', 'approved', 'declined', 'voided', 'error')", name=op.f("ck_payments_valid_status")
        ),
        sa.ForeignKeyConstraint(
            ["order_id"], ["orders.id"], name=op.f("fk_payments_order_id_orders"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["rental_id"], ["rentals.id"], name=op.f("fk_payments_rental_id_rentals"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_payments_user_id_users"), ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_payments")),
        sa.UniqueConstraint("provider_transaction_id", name=op.f("uq_payments_provider_transaction_id")),
        sa.UniqueConstraint("reference", name=op.f("uq_payments_reference")),
    )
    op.create_index(op.f("ix_payments_order_id"), "payments", ["order_id"], unique=False)
    op.create_index(op.f("ix_payments_rental_id"), "payments", ["rental_id"], unique=False)
    op.create_index(op.f("ix_payments_user_id"), "payments", ["user_id"], unique=False)
    op.create_index(
        "uq_payments_order_approved",
        "payments",
        ["order_id"],
        unique=True,
        postgresql_where=sa.text("status = 'approved' AND NOT requires_refund"),
    )
    op.create_index(
        "uq_payments_rental_approved",
        "payments",
        ["rental_id"],
        unique=True,
        postgresql_where=sa.text("status = 'approved' AND NOT requires_refund"),
    )

    op.create_table(
        "payment_events",
        sa.Column("checksum", sa.String(length=64), nullable=False),
        sa.Column("event", sa.String(length=60), nullable=False),
        sa.Column("transaction_id", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_payment_events")),
        sa.UniqueConstraint("checksum", name=op.f("uq_payment_events_checksum")),
    )
    op.create_index(op.f("ix_payment_events_transaction_id"), "payment_events", ["transaction_id"], unique=False)

    op.execute("CREATE SEQUENCE invoice_number_seq START 1")
    op.create_table(
        "invoices",
        sa.Column("number", sa.BigInteger(), nullable=False),
        sa.Column("prefix", sa.String(length=10), nullable=False),
        sa.Column("payment_id", sa.UUID(), nullable=False),
        sa.Column("order_id", sa.UUID(), nullable=True),
        sa.Column("rental_id", sa.UUID(), nullable=True),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("buyer_name", sa.String(length=160), nullable=False),
        sa.Column("buyer_document_type", sa.String(length=3), nullable=False),
        sa.Column("buyer_document_number", sa.String(length=20), nullable=False),
        sa.Column("buyer_email", sa.String(length=254), nullable=False),
        sa.Column("subtotal", sa.BigInteger(), nullable=False),
        sa.Column("vat", sa.BigInteger(), nullable=False),
        sa.Column("total", sa.BigInteger(), nullable=False),
        sa.Column("pdf", sa.LargeBinary(), nullable=False),
        sa.Column("xml", sa.Text(), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.CheckConstraint(ONE_TARGET, name=op.f("ck_invoices_one_target")),
        sa.CheckConstraint("total = subtotal + vat", name=op.f("ck_invoices_total_consistent")),
        sa.ForeignKeyConstraint(
            ["order_id"], ["orders.id"], name=op.f("fk_invoices_order_id_orders"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["payment_id"], ["payments.id"], name=op.f("fk_invoices_payment_id_payments"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["rental_id"], ["rentals.id"], name=op.f("fk_invoices_rental_id_rentals"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_invoices_user_id_users"), ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_invoices")),
        sa.UniqueConstraint("number", name=op.f("uq_invoices_number")),
        sa.UniqueConstraint("order_id", name=op.f("uq_invoices_order_id")),
        sa.UniqueConstraint("payment_id", name=op.f("uq_invoices_payment_id")),
        sa.UniqueConstraint("rental_id", name=op.f("uq_invoices_rental_id")),
    )
    op.create_index(op.f("ix_invoices_user_id"), "invoices", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_invoices_user_id"), table_name="invoices")
    op.drop_table("invoices")
    op.execute("DROP SEQUENCE invoice_number_seq")
    op.drop_index(op.f("ix_payment_events_transaction_id"), table_name="payment_events")
    op.drop_table("payment_events")
    op.drop_index(
        "uq_payments_rental_approved",
        table_name="payments",
        postgresql_where=sa.text("status = 'approved' AND NOT requires_refund"),
    )
    op.drop_index(
        "uq_payments_order_approved",
        table_name="payments",
        postgresql_where=sa.text("status = 'approved' AND NOT requires_refund"),
    )
    op.drop_index(op.f("ix_payments_user_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_rental_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_order_id"), table_name="payments")
    op.drop_table("payments")

    op.drop_constraint(op.f("ck_consent_records_rental_consent_has_rental"), "consent_records", type_="check")
    op.drop_constraint(op.f("ck_consent_records_valid_purpose"), "consent_records", type_="check")
    op.execute("DELETE FROM consent_records WHERE purpose = 'alquiler'")
    op.create_check_constraint("valid_purpose", "consent_records", "purpose IN ('registro', 'pedido')")
    op.drop_constraint(op.f("fk_consent_records_rental_id_rentals"), "consent_records", type_="foreignkey")
    op.drop_column("consent_records", "rental_id")

    op.drop_constraint(op.f("rentals_no_overlap"), "rentals")
    for column in ("document_number", "document_type", "contact_phone", "contact_email", "contact_name"):
        op.drop_column("rentals", column)
    op.drop_column("rentals", "payment_expires_at")
    op.drop_column("rentals", "period")
    op.drop_constraint(op.f("fk_rentals_rental_unit_id_rental_units"), "rentals", type_="foreignkey")
    op.drop_column("rentals", "rental_unit_id")
    op.drop_index(op.f("ix_rental_units_product_id"), table_name="rental_units")
    op.drop_index(op.f("ix_rental_units_branch_id"), table_name="rental_units")
    op.drop_table("rental_units")
    op.drop_index(op.f("ix_rental_rates_product_id"), table_name="rental_rates")
    op.drop_table("rental_rates")

    # Un pedido pagado ya descontó su inventario: pasa a "completado" (no a
    # "confirmado", que lo descontaría otra vez al completarse).
    op.drop_constraint(op.f("ck_orders_valid_status"), "orders", type_="check")
    op.execute("UPDATE orders SET status = 'completed' WHERE status = 'paid'")
    op.create_check_constraint("valid_status", "orders", f"status IN {ORDER_STATUSES_OLD}")
    op.drop_column("orders", "stock_settled_at")
    op.drop_column("orders", "payment_expires_at")
    op.drop_constraint(op.f("ck_orders_valid_payment_method"), "orders", type_="check")
    op.execute("UPDATE orders SET payment_method = 'tarjeta' WHERE payment_method IS NULL")
    op.alter_column("orders", "payment_method", existing_type=sa.String(length=20), nullable=False)
    op.create_check_constraint("valid_payment_method", "orders", f"payment_method IN {PAYMENT_METHODS}")
