from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError

PAGE_SIZE = 20

UNIQUE_MESSAGES = {
    "uq_products_slug": "Ya existe un producto con esa URL (slug).",
    "uq_products_sku": "Ya existe un producto con ese SKU.",
    "uq_categories_slug": "Ya existe una categoría con ese slug.",
    "uq_categories_name": "Ya existe una categoría con ese nombre.",
    "uq_branches_slug": "Ya existe una sucursal con ese slug.",
}


def commit_or_conflict(db: Session) -> None:
    """Traduce violaciones de unicidad/restricciones a errores 409 legibles."""
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        detail = str(error.orig)
        for constraint, message in UNIQUE_MESSAGES.items():
            if constraint in detail:
                raise ConflictError(message) from error
        raise ConflictError("Los datos no cumplen las restricciones de la base de datos.") from error
