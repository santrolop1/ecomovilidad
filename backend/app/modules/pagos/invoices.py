"""Factura de venta (PDF y XML) emitida al aprobarse un pago.

Numeración consecutiva con la secuencia `invoice_number_seq` y prefijo
configurable. Los precios del catálogo incluyen IVA: la factura separa base e
impuesto.

NO es una factura electrónica DIAN: para eso faltan la resolución de
facturación (rango y prefijo autorizados), el CUFE y la transmisión a través de
un proveedor tecnológico. El PDF y el XML lo dicen expresamente. Además, una
secuencia de PostgreSQL puede dejar huecos si una transacción se revierte.
"""

import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

from fpdf import FPDF
from fpdf.fonts import FontFace
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Invoice, Order, Payment, Rental

BOGOTA = ZoneInfo("America/Bogota")
DIAN_NOTICE = (
    "Documento generado por EcoMovilidad. No es una factura electrónica validada por la DIAN: "
    "falta la resolución de facturación y el proveedor tecnológico."
)


@dataclass(frozen=True)
class InvoiceLine:
    description: str
    quantity: int
    unit_price: int
    total: int


def split_vat(total: int, vat_percent: int) -> tuple[int, int]:
    """(base, IVA) de un total que ya incluye el IVA, en pesos enteros."""
    base = round(total * 100 / (100 + vat_percent))
    return base, total - base


def _cop(amount: int) -> str:
    return "$ " + f"{amount:,}".replace(",", ".")


def _local(moment: datetime) -> str:
    return moment.astimezone(BOGOTA).strftime("%d/%m/%Y %H:%M")


def _order_lines(order: Order) -> list[InvoiceLine]:
    return [InvoiceLine(i.product.name, i.quantity, i.unit_price, i.subtotal) for i in order.items]


def _rental_lines(rental: Rental) -> list[InvoiceLine]:
    period = f"{_local(rental.start_at)} a {_local(rental.end_at)}"
    unit = f", unidad {rental.unit.code}" if rental.unit else ""
    return [InvoiceLine(f"Alquiler {rental.product.name} ({period}{unit})", 1, rental.price, rental.price)]


def _pdf(invoice: Invoice, lines: list[InvoiceLine], payment: Payment, concept: str) -> bytes:
    settings = get_settings()
    pdf = FPDF(format="Letter")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 9, settings.company_name, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 5, f"NIT: {settings.company_nit or 'pendiente de configurar'}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5, "Área metropolitana de Bucaramanga, Santander, Colombia", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, f"Factura de venta {invoice.full_number}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 5, f"Fecha de emisión: {_local(invoice.issued_at)}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5, concept, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Adquiriente", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 5, invoice.buyer_name, new_x="LMARGIN", new_y="NEXT")
    pdf.cell(
        0,
        5,
        f"{invoice.buyer_document_type} {invoice.buyer_document_number}  |  {invoice.buyer_email}",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(4)

    widths = (100, 18, 34, 34)
    pdf.set_font("Helvetica", "", 9)
    with pdf.table(
        col_widths=widths,
        width=sum(widths),
        align="LEFT",
        text_align=("LEFT", "RIGHT", "RIGHT", "RIGHT"),
        borders_layout="HORIZONTAL_LINES",
        line_height=5,
        padding=1.5,
        headings_style=FontFace(emphasis="BOLD", color=(248, 250, 252), fill_color=(7, 17, 31)),
    ) as table:
        table.row(("Descripción", "Cant.", "Valor unitario", "Total"))
        for line in lines:  # la descripción se ajusta en varias líneas si es larga
            table.row((line.description, str(line.quantity), _cop(line.unit_price), _cop(line.total)))
    pdf.ln(2)

    vat_percent = settings.invoice_vat_percent
    for label, amount, bold in (
        ("Subtotal (base gravable)", invoice.subtotal, False),
        (f"IVA {vat_percent} % (incluido en los precios)", invoice.vat, False),
        ("Total pagado", invoice.total, True),
    ):
        pdf.set_font("Helvetica", "B" if bold else "", 10 if bold else 9)
        pdf.cell(sum(widths[:3]), 6, label, align="R")
        pdf.cell(widths[3], 6, _cop(amount), align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Helvetica", "", 9)
    method = payment.payment_method_type or "pasarela"
    gateway = (
        "la pasarela de pruebas de EcoMovilidad (pago simulado, sin cobro real)"
        if payment.provider == "simulado"
        else f"Wompi ({method})"
    )
    pdf.multi_cell(
        0,
        5,
        f"Pago aprobado por {gateway}. Referencia {payment.reference}, transacción "
        f"{payment.provider_transaction_id or '-'}.",
    )
    pdf.ln(3)
    pdf.set_font("Helvetica", "I", 8)
    pdf.multi_cell(0, 4, DIAN_NOTICE)
    return bytes(pdf.output())


def _xml(invoice: Invoice, lines: list[InvoiceLine], payment: Payment) -> str:
    """XML con estructura inspirada en UBL 2.1; NO cumple el anexo técnico de la DIAN."""
    settings = get_settings()
    root = ET.Element("Invoice", {"xmlns": "urn:ecomovilidad:invoice:1", "dianValidated": "false"})
    ET.SubElement(root, "ID").text = invoice.full_number
    ET.SubElement(root, "IssueDate").text = invoice.issued_at.astimezone(BOGOTA).isoformat()
    ET.SubElement(root, "Currency").text = "COP"
    ET.SubElement(root, "Note").text = DIAN_NOTICE
    supplier = ET.SubElement(root, "Supplier")
    ET.SubElement(supplier, "Name").text = settings.company_name
    ET.SubElement(supplier, "NIT").text = settings.company_nit or "pendiente"
    customer = ET.SubElement(root, "Customer")
    ET.SubElement(customer, "Name").text = invoice.buyer_name
    ET.SubElement(customer, "DocumentType").text = invoice.buyer_document_type
    ET.SubElement(customer, "DocumentNumber").text = invoice.buyer_document_number
    ET.SubElement(customer, "Email").text = invoice.buyer_email
    lines_el = ET.SubElement(root, "Lines")
    for number, line in enumerate(lines, start=1):
        el = ET.SubElement(lines_el, "Line", {"number": str(number)})
        ET.SubElement(el, "Description").text = line.description
        ET.SubElement(el, "Quantity").text = str(line.quantity)
        ET.SubElement(el, "UnitPrice").text = str(line.unit_price)
        ET.SubElement(el, "Total").text = str(line.total)
    totals = ET.SubElement(root, "Totals")
    ET.SubElement(totals, "TaxableAmount").text = str(invoice.subtotal)
    ET.SubElement(totals, "VAT", {"percent": str(settings.invoice_vat_percent)}).text = str(invoice.vat)
    ET.SubElement(totals, "Payable").text = str(invoice.total)
    pay = ET.SubElement(root, "Payment")
    ET.SubElement(pay, "Provider").text = payment.provider
    ET.SubElement(pay, "Reference").text = payment.reference
    ET.SubElement(pay, "TransactionId").text = payment.provider_transaction_id or ""
    ET.SubElement(pay, "Method").text = payment.payment_method_type or ""
    ET.indent(root)
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding="unicode")


def issue_invoice(
    db: Session, payment: Payment, *, order: Order | None = None, rental: Rental | None = None
) -> Invoice:
    """Emite la factura de un pago aprobado. Va en la misma transacción que
    aplica el pago (si algo falla, no queda ni el pago aplicado ni la factura)."""
    settings = get_settings()
    target = order or rental
    assert target is not None
    total = target.total if order else rental.price  # type: ignore[union-attr]
    subtotal, vat = split_vat(total, settings.invoice_vat_percent)
    invoice = Invoice(
        number=db.scalar(text("SELECT nextval('invoice_number_seq')")),
        prefix=settings.invoice_prefix,
        payment_id=payment.id,
        order_id=order.id if order else None,
        rental_id=rental.id if rental else None,
        user_id=payment.user_id,
        buyer_name=target.contact_name or "",
        buyer_document_type=target.document_type or "CC",
        buyer_document_number=target.document_number or "",
        buyer_email=target.contact_email or "",
        subtotal=subtotal,
        vat=vat,
        total=total,
        issued_at=datetime.now(BOGOTA),
    )
    if order:
        lines = _order_lines(order)
        concept = f"Compra, pedido #{str(order.id)[:8].upper()}"
    else:
        lines = _rental_lines(rental)  # type: ignore[arg-type]
        concept = f"Alquiler #{str(rental.id)[:8].upper()} en {rental.branch.name}"  # type: ignore[union-attr]
    invoice.pdf = _pdf(invoice, lines, payment, concept)
    invoice.xml = _xml(invoice, lines, payment)
    db.add(invoice)
    db.flush()
    return invoice
