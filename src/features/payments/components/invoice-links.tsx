import { FileCode2, FileText } from "lucide-react";
import type { InvoiceRef } from "@/types";

/** Descargas de la factura: pasan por Next.js con la sesión del usuario (nunca directo a FastAPI). */
export function InvoiceLinks({ invoice, admin = false }: { invoice: InvoiceRef; admin?: boolean }) {
  const base = admin ? "/api/admin/facturas" : "/api/facturas";
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`${base}/${invoice.id}/pdf`}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm hover:border-foreground/40"
      >
        <FileText className="size-4" aria-hidden="true" />
        Factura PDF
      </a>
      <a
        href={`${base}/${invoice.id}/xml`}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm hover:border-foreground/40"
      >
        <FileCode2 className="size-4" aria-hidden="true" />
        XML
      </a>
    </div>
  );
}
