from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import get_settings
from app.services.errors import ServiceError

settings = get_settings()

app = FastAPI(
    title="EcoMovilidad API",
    version="0.1.0",
    description="Catálogo, inventario, carrito, pedidos y alquiler. Área metropolitana de Bucaramanga.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)


@app.exception_handler(ServiceError)
def handle_service_error(_: Request, error: ServiceError) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content={"detail": error.message})


app.include_router(api_router)
