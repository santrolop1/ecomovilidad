import { proxyDownload } from "@/lib/api/backend-proxy";

const ID = /^[0-9a-f-]{36}$/i;

/** Factura propia (PDF o XML). FastAPI responde 404 si es de otro usuario. */
export async function GET(_request: Request, { params }: RouteContext<"/api/facturas/[id]/[format]">) {
  const { id, format } = await params;
  if (!ID.test(id) || (format !== "pdf" && format !== "xml")) return new Response("No encontrado.", { status: 404 });
  return proxyDownload(`/invoices/${id}/${format}`);
}
