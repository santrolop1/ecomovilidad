import "server-only";
import { serverEnv } from "@/config/server-env";
import { sessionHeaders } from "./session-cookies";

const TIMEOUT_MS = 15_000;

/**
 * Descarga un archivo de FastAPI con la sesión del usuario (cookies y CSRF) y
 * lo devuelve al navegador. El navegador nunca habla con FastAPI.
 */
export async function proxyDownload(path: string): Promise<Response> {
  if (serverEnv.apiMode !== "real" || !serverEnv.apiBaseUrl) {
    return new Response("Las descargas requieren el backend.", { status: 503 });
  }
  const headers = await sessionHeaders("GET");
  if (!headers) return new Response("Inicia sesión para continuar.", { status: 401 });
  let upstream: Response;
  try {
    upstream = await fetch(`${serverEnv.apiBaseUrl.replace(/\/$/, "")}${path}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return new Response("No pudimos conectarnos con el servicio.", { status: 502 });
  }
  if (!upstream.ok) {
    return new Response(upstream.status === 404 ? "No encontramos ese archivo." : "No pudimos descargar el archivo.", {
      status: upstream.status === 404 ? 404 : 502,
    });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "attachment",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Reenvía a FastAPI un evento de Wompi tal cual (cuerpo y checksum). FastAPI
 * verifica la firma; Next.js solo hace de puerta de entrada pública.
 */
export async function relayWompiEvent(request: Request): Promise<Response> {
  if (serverEnv.apiMode !== "real" || !serverEnv.apiBaseUrl) return new Response(null, { status: 503 });
  const body = await request.text();
  if (body.length > 64_000) return new Response(null, { status: 413 });
  const checksum = request.headers.get("x-event-checksum");
  try {
    const upstream = await fetch(`${serverEnv.apiBaseUrl.replace(/\/$/, "")}/payments/webhooks/wompi`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(checksum ? { "X-Event-Checksum": checksum } : {}) },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return new Response(null, { status: upstream.status });
  } catch {
    return new Response(null, { status: 502 }); // Wompi reintentará
  }
}

/** Reenvía a FastAPI la posición de un dispositivo GPS, con su token. */
export async function relayTelemetry(request: Request): Promise<Response> {
  if (serverEnv.apiMode !== "real" || !serverEnv.apiBaseUrl) return new Response(null, { status: 503 });
  const body = await request.text();
  if (body.length > 1_000) return new Response(null, { status: 413 });
  const authorization = request.headers.get("authorization");
  try {
    const upstream = await fetch(`${serverEnv.apiBaseUrl.replace(/\/$/, "")}/telemetry/positions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
