import { relayWompiEvent } from "@/lib/api/backend-proxy";

/**
 * URL de eventos para el panel de Wompi: https://<dominio>/api/webhooks/wompi
 * (con la demo, la del túnel de Cloudflare). FastAPI sigue sin exponerse.
 */
export async function POST(request: Request) {
  return relayWompiEvent(request);
}
