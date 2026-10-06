import uuid

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.api.deps import DbSession
from app.repositories import catalog as repo
from app.schemas.catalog import CategoryOut, InventoryOut, ProductListOut, ProductOut
from app.services.catalog import parse_filters, query_products, to_product_out

router = APIRouter(tags=["catálogo"])


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: DbSession):
    return repo.list_categories(db)


@router.get("/products", response_model=ProductListOut, response_model_exclude_none=True)
def list_products(
    request: Request,
    db: DbSession,
    destacados: bool = False,
    limite: int | None = Query(default=None, ge=1, le=100),
):
    """Filtros: q, categoria, marca (separadas por coma), precioMin, precioMax,
    orden (relevancia|precio-asc|precio-desc|nombre|nuevos) y spec_<clave>."""
    params = {key: request.query_params.getlist(key) for key in request.query_params}
    products = repo.list_active_products(db)
    if destacados:
        products = [p for p in products if p.is_featured]
    result = query_products(products, parse_filters(params))
    if limite is not None:
        result.items = result.items[:limite]
    return result


@router.get("/products/{slug}", response_model=ProductOut, response_model_exclude_none=True)
def get_product(slug: str, db: DbSession):
    product = repo.get_product_by_slug(db, slug)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "El producto no existe.")
    return to_product_out(product)


@router.get("/products/{product_id}/inventory", response_model=list[InventoryOut])
def get_product_inventory(product_id: uuid.UUID, db: DbSession):
    if repo.get_product(db, product_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "El producto no existe.")
    return [
        InventoryOut(
            branch_id=inv.branch_id,
            branch_slug=inv.branch.slug,
            branch_name=inv.branch.name,
            city=inv.branch.city,
            available_quantity=inv.available_quantity,
            reserved_quantity=inv.reserved_quantity,
            total_quantity=inv.total_quantity,
            updated_at=inv.updated_at,
        )
        for inv in repo.list_product_inventory(db, product_id)
    ]
