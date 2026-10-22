import uuid
from typing import Literal

from fastapi import APIRouter, Response
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.core.errors import NotFoundError
from app.models import Invoice

router = APIRouter(prefix="/invoices", tags=["facturas"])


def invoice_response(invoice: Invoice, fmt: Literal["pdf", "xml"]) -> Response:
    if fmt == "pdf":
        content, media = invoice.pdf, "application/pdf"
    else:
        content, media = invoice.xml.encode(), "application/xml"
    return Response(
        content,
        media_type=media,
        headers={
            "Content-Disposition": f'attachment; filename="factura-{invoice.full_number}.{fmt}"',
            "Cache-Control": "private, no-store",
        },
    )


@router.get("/{invoice_id}/{fmt}")
def download_invoice(invoice_id: uuid.UUID, fmt: Literal["pdf", "xml"], user: CurrentUser, db: DbSession):
    """Factura propia en PDF o XML (404 si es de otro usuario)."""
    invoice = db.scalars(select(Invoice).where(Invoice.id == invoice_id, Invoice.user_id == user.id)).one_or_none()
    if invoice is None:
        raise NotFoundError("La factura no existe.")
    return invoice_response(invoice, fmt)
