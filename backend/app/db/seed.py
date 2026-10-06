"""Carga los datos de DEMOSTRACIÓN (categorías, sucursales, productos e inventario).

Si existen DEMO_ADMIN_EMAIL y DEMO_ADMIN_PASSWORD crea además un administrador
de DESARROLLO (docker-compose.yml las define solo para el entorno local).

Idempotente: se puede ejecutar varias veces. Catálogo y sucursales se
actualizan por `slug`; el inventario solo se crea si no existe, para no
pisar reservas de pedidos reales.

    uv run python -m app.db.seed
"""

import json
import os
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Branch, Category, Inventory, Product, User

SEED_FILE = Path(__file__).with_name("seed_data.json")


def load_seed_data() -> dict[str, Any]:
    return json.loads(SEED_FILE.read_text(encoding="utf-8"))


def _upsert(session: Session, model: type, rows: list[dict[str, Any]], key: str = "slug") -> dict[str, Any]:
    stmt = insert(model).values(rows)
    update_cols = {col: stmt.excluded[col] for col in rows[0] if col != key}
    session.execute(stmt.on_conflict_do_update(index_elements=[key], set_=update_cols))
    return {row.slug: row.id for row in session.execute(select(model.slug, model.id))}


def seed(session: Session) -> dict[str, int]:
    data = load_seed_data()

    category_ids = _upsert(session, Category, data["categories"])

    branch_rows = [{**branch, "is_demo": True, "is_active": True} for branch in data["branches"]]
    branch_ids = _upsert(session, Branch, branch_rows)

    product_rows = [
        {
            "category_id": category_ids[p["category"]],
            "slug": p["slug"],
            "sku": p["sku"],
            "name": p["name"],
            "brand": p["brand"],
            "short_description": p["short_description"],
            "description": p["description"],
            "price": p["price"],
            "compare_at_price": p["compare_at_price"],
            "specifications": p["specifications"],
            "highlights": p["highlights"],
            "image_url": p["image_url"],
            "is_featured": p["is_featured"],
            "is_active": True,
        }
        for p in data["products"]
    ]
    product_ids = _upsert(session, Product, product_rows)

    inventory_rows = [
        {
            "product_id": product_ids[p["slug"]],
            "branch_id": branch_ids[entry["branch"]],
            "total_quantity": entry["quantity"],
            "available_quantity": entry["quantity"],
            "reserved_quantity": 0,
        }
        for p in data["products"]
        for entry in p["inventory"]
    ]
    if inventory_rows:
        session.execute(
            insert(Inventory).values(inventory_rows).on_conflict_do_nothing(constraint="uq_inventory_product_branch")
        )

    session.commit()
    return {
        "categories": len(data["categories"]),
        "branches": len(branch_rows),
        "products": len(product_rows),
        "inventory": len(inventory_rows),
    }


def ensure_demo_admin(session: Session, email: str, password: str) -> None:
    """Crea (o promueve) el administrador de desarrollo. No cambia una contraseña existente."""
    user = session.scalars(select(User).where(User.email == email.lower())).one_or_none()
    if user is None:
        user = User(
            email=email.lower(),
            password_hash=hash_password(password),
            first_name="Admin",
            last_name="Demo",
            phone="+57 607 000 0000",
        )
        session.add(user)
    user.is_admin = True
    user.is_active = True
    session.commit()


if __name__ == "__main__":
    with SessionLocal() as db:
        print("Datos DEMO cargados:", seed(db))
        admin_email, admin_password = os.environ.get("DEMO_ADMIN_EMAIL"), os.environ.get("DEMO_ADMIN_PASSWORD")
        if admin_email and admin_password:
            ensure_demo_admin(db, admin_email, admin_password)
            print(f"Administrador de DESARROLLO listo: {admin_email}")
