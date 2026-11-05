import { adminApi } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/errors";

/** Flota para el mapa operativo. FastAPI exige la sesión de un administrador. */
export async function GET() {
  try {
    return Response.json(await adminApi.fleet(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return new Response(null, { status: isApiError(error) && error.status ? error.status : 502 });
  }
}
