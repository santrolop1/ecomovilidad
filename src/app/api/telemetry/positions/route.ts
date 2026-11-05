import { relayTelemetry } from "@/lib/api/backend-proxy";

/**
 * Entrada pública de los dispositivos GPS: https://<dominio>/api/telemetry/positions
 * FastAPI valida el token del dispositivo y sigue sin exponerse a Internet.
 */
export async function POST(request: Request) {
  return relayTelemetry(request);
}
