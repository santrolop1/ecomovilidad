import { api } from "@/lib/api";

/** BFF del seguimiento público: el navegador nunca habla con FastAPI. */
export async function GET(_request: Request, { params }: RouteContext<"/api/seguimiento/[token]">) {
  const { token } = await params;
  const tracking = await api.orders.getTracking(token);
  if (!tracking) return new Response(null, { status: 404 });
  return Response.json(tracking, { headers: { "Cache-Control": "no-store" } });
}
