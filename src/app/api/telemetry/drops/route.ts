import { relayTelemetry } from "@/lib/api/backend-proxy";

/**
 * Un dron de domicilios avisa que liberó el paquete: https://<dominio>/api/telemetry/drops
 * FastAPI valida el token del dron y que esté a menos de 50 m del punto de entrega.
 */
export async function POST(request: Request) {
  return relayTelemetry(request, "drops");
}
