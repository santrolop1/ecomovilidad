import { api } from "@/lib/api";

/**
 * BFF de solo lectura para refrescar la disponibilidad por sucursal desde el
 * navegador (RF 1.2) sin exponer el backend ni enviar mocks al cliente.
 */
export async function GET() {
  const branches = await api.branches.listBranches();
  return Response.json(branches, { headers: { "Cache-Control": "no-store" } });
}
