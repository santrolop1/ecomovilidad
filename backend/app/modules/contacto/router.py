from fastapi import APIRouter, Request, status

from app.api.deps import DbSession
from app.modules.autenticacion.client_ip import client_ip
from app.modules.contacto import service
from app.modules.contacto.schemas import ContactAck, ContactMessageIn

router = APIRouter(prefix="/contact", tags=["contacto"])


@router.post("", response_model=ContactAck, status_code=status.HTTP_201_CREATED)
def send_message(data: ContactMessageIn, request: Request, db: DbSession):
    ip = client_ip(request)
    return service.create_message(db, data, ip.address if ip.reliable else None)
