"use server";

import { api } from "@/lib/api";
import { type ActionResult, runAction } from "@/lib/action-result";
import { clearSessionCookies, hasSessionCookie } from "@/lib/api/session-cookies";
import type { User } from "@/types";
import { loginSchema, registerSchema } from "./lib/schemas";

/**
 * FastAPI emite las cookies de sesión; el cliente HTTP las copia al navegador
 * como httpOnly. Las Server Actions de Next.js ya verifican el Origin (CSRF).
 */
export async function login(input: unknown): Promise<ActionResult<User>> {
  return runAction(loginSchema, input, async (data) => (await api.auth.login(data)).user);
}

export async function register(input: unknown): Promise<ActionResult<User>> {
  return runAction(registerSchema, input, async ({ firstName, lastName, email, phone, password, dataConsent }) => {
    const session = await api.auth.register({ firstName, lastName, email, phone, password, dataConsent });
    return session.user;
  });
}

export async function logout(): Promise<void> {
  try {
    await api.auth.logout();
  } catch {
    // La sesión pudo expirar en el servidor: igual se borran las cookies locales.
  } finally {
    await clearSessionCookies();
  }
}

/** Usuario de la sesión actual, o null. Sin cookie no llama al backend. */
export async function getSessionUser(): Promise<User | null> {
  if (!(await hasSessionCookie())) return null;
  try {
    return await api.auth.me();
  } catch {
    return null;
  }
}
