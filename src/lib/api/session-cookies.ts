import "server-only";
import { cookies, headers } from "next/headers";
import { clientIpFromHeaders } from "./client-ip";

/** Mismos nombres que emite FastAPI (backend/app/core/security.py). */
export const SESSION_COOKIE = "em_session";
export const CSRF_COOKIE = "em_csrf";
const SESSION_COOKIES = [SESSION_COOKIE, CSRF_COOKIE];

/**
 * Cabeceras para llamar a FastAPI en nombre del usuario. Ambas cookies son
 * httpOnly en el dominio del frontend: solo el servidor de Next.js las lee.
 */
export async function sessionHeaders(method: string): Promise<Record<string, string> | null> {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  const csrf = store.get(CSRF_COOKIE)?.value;
  if (!session || !csrf) return null;
  return {
    Cookie: `${SESSION_COOKIE}=${session}; ${CSRF_COOKIE}=${csrf}`,
    ...(method === "GET" ? {} : { "X-CSRF-Token": csrf }),
  };
}

/** Copia al navegador las cookies de sesión emitidas por FastAPI (login/registro). */
export async function relaySessionCookies(response: Response): Promise<void> {
  const store = await cookies();
  for (const header of response.headers.getSetCookie()) {
    const [pair, ...attributes] = header.split(";");
    const separator = pair.indexOf("=");
    const name = pair.slice(0, separator).trim();
    if (!SESSION_COOKIES.includes(name)) continue;
    const maxAge = attributes.map((a) => a.trim().split("=")).find(([key]) => key.toLowerCase() === "max-age")?.[1];
    store.set(name, pair.slice(separator + 1).trim(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(maxAge ? { maxAge: Number(maxAge) } : {}),
    });
  }
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  for (const name of SESSION_COOKIES) store.delete(name);
}

export async function hasSessionCookie(): Promise<boolean> {
  return (await cookies()).has(SESSION_COOKIE);
}

/** IP del navegador para FastAPI (una sola IP fiable; ver client-ip.ts). */
export async function forwardedFor(): Promise<Record<string, string>> {
  const ip = clientIpFromHeaders(await headers());
  return ip ? { "X-Forwarded-For": ip } : {};
}
