import type { z } from "zod";
import { ApiError, type ApiErrorCode } from "./errors";
import { forwardedFor, relaySessionCookies, sessionHeaders } from "./session-cookies";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions<T> {
  method?: HttpMethod;
  body?: unknown;
  query?: URLSearchParams;
  /** Esquema Zod con el que se valida la respuesta. */
  schema: z.ZodType<T>;
  /** Caché de Next.js para lecturas públicas (catálogo, sucursales). */
  next?: { revalidate?: number | false; tags?: string[] };
  /** Envía la sesión del usuario (cookies + CSRF). Nunca se cachea. */
  auth?: boolean;
  /** Copia al navegador las cookies de sesión de la respuesta (login/registro). */
  relayCookies?: boolean;
}

export interface HttpClient {
  request<T>(path: string, options: RequestOptions<T>): Promise<T>;
}

const DEFAULT_TIMEOUT_MS = 10_000;

function codeForStatus(status: number): ApiErrorCode {
  if (status === 401 || status === 403) return "UNAUTHORIZED";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "OUT_OF_STOCK";
  if (status === 429) return "RATE_LIMITED";
  if (status === 422 || status === 400) return "VALIDATION_ERROR";
  if (status >= 500) return "SERVICE_UNAVAILABLE";
  return "UNKNOWN";
}

/** FastAPI devuelve { detail: string } (errores de negocio) o { detail: [...] } (validación). */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === "object" && "detail" in data && typeof data.detail === "string") {
      return data.detail;
    }
  } catch {
    // Respuesta sin cuerpo JSON.
  }
  return response.status === 422
    ? "Algunos datos no son válidos. Revisa el formulario."
    : "El servicio respondió con un error. Inténtalo de nuevo en unos minutos.";
}

/**
 * Cliente HTTP para FastAPI. Se ejecuta SOLO en el servidor de Next.js
 * (Server Components, Server Actions y route handlers).
 */
export function createHttpClient(baseUrl: string, timeoutMs = DEFAULT_TIMEOUT_MS): HttpClient {
  const base = baseUrl.replace(/\/$/, "");

  return {
    async request<T>(path: string, options: RequestOptions<T>): Promise<T> {
      const method = options.method ?? "GET";
      const url = new URL(`${base}${path}`);
      options.query?.forEach((value, key) => url.searchParams.append(key, value));

      let authHeaders: Record<string, string> = {};
      if (options.auth) {
        const headers = await sessionHeaders(method);
        if (!headers) throw new ApiError("UNAUTHORIZED", "Inicia sesión para continuar.", 401);
        authHeaders = headers;
      }
      // Login/registro: se reenvía la IP del cliente para el límite de intentos por IP.
      if (options.relayCookies) authHeaders = { ...authHeaders, ...(await forwardedFor()) };

      let response: Response;
      try {
        response = await fetch(url, {
          method,
          headers: {
            Accept: "application/json",
            ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...authHeaders,
          },
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: AbortSignal.timeout(timeoutMs),
          ...(options.auth || method !== "GET" ? { cache: "no-store" as const } : options.next ? { next: options.next } : {}),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "TimeoutError") {
          throw new ApiError("TIMEOUT", "El servicio tardó demasiado en responder.");
        }
        throw new ApiError("NETWORK_ERROR", "No pudimos conectarnos con el servicio.");
      }

      if (!response.ok) {
        throw new ApiError(codeForStatus(response.status), await readErrorMessage(response), response.status);
      }
      if (options.relayCookies) await relaySessionCookies(response);

      const data: unknown = response.status === 204 ? null : await response.json();
      const parsed = options.schema.safeParse(data);
      if (!parsed.success) {
        throw new ApiError("INVALID_RESPONSE", "Recibimos una respuesta inesperada del servicio.", response.status);
      }
      return parsed.data;
    },
  };
}
