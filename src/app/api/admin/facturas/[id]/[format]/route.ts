import { proxyDownload } from "@/lib/api/backend-proxy";

const ID = /^[0-9a-f-]{36}$/i;

/** Cualquier factura, para administradores (FastAPI exige el rol). */
export async function GET(_request: Request, { params }: RouteContext<"/api/admin/facturas/[id]/[format]">) {
  const { id, format } = await params;
  if (!ID.test(id) || (format !== "pdf" && format !== "xml")) return new Response("No encontrado.", { status: 404 });
  return proxyDownload(`/admin/invoices/${id}/${format}`);
}
