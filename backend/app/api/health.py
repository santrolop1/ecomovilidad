from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import DbSession

router = APIRouter(tags=["salud"])


@router.get("/health")
def health(db: DbSession) -> dict[str, str]:
    """Comprueba la conexión a PostgreSQL y la extensión PostGIS."""
    postgis = db.execute(text("SELECT postgis_lib_version()")).scalar_one()
    return {"status": "ok", "postgis": postgis}
