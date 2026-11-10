import { z } from "zod";
import { consentField, emailField, phoneField } from "@/lib/validation";

export const PASSWORD_MIN_LENGTH = 10;

const nameField = z.string().trim().min(2, "Escribe al menos 2 letras.").max(80, "Máximo 80 caracteres.");

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Escribe tu contraseña.").max(128),
});

/** Mismas reglas que valida FastAPI (backend/app/schemas/auth.py). */
export const registerSchema = z
  .object({
    firstName: nameField,
    lastName: nameField,
    email: emailField,
    phone: phoneField,
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Usa al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
      .max(128, "Máximo 128 caracteres.")
      .regex(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, "Incluye al menos una letra.")
      .regex(/\d/, "Incluye al menos un número."),
    confirmPassword: z.string(),
    dataConsent: consentField,
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

/** Solo rutas internas: evita redirecciones abiertas (?next=https://otro-sitio). */
/**
 * Ruta interna a la que volver tras ingresar. Rechaza todo lo que un navegador
 * pueda leer como otro sitio: `//x`, `/\\x` (equivale a `//x`) y caracteres de
 * control, que el navegador elimina antes de interpretar la URL.
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  const base = "http://interno.invalid";
  const url = new URL(value, base);
  return url.origin === base ? url.pathname + url.search + url.hash : "/";
}

const strongPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Usa al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(128, "Máximo 128 caracteres.")
  .regex(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, "Incluye al menos una letra.")
  .regex(/\d/, "Incluye al menos un número.");

export const profileSchema = z.object({
  firstName: nameField,
  lastName: nameField,
  phone: phoneField,
  documentNumber: z
    .string()
    .trim()
    .regex(/^(?:[A-Za-z0-9-]{5,20})?$/, "Número de documento no válido."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Escribe tu contraseña actual.").max(128),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "Las contraseñas no coinciden.", path: ["confirmPassword"] });

export const resetRequestSchema = z.object({ email: emailField });

export const resetConfirmSchema = z
  .object({
    token: z.string().min(20, "El enlace no es válido.").max(200),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "Las contraseñas no coinciden.", path: ["confirmPassword"] });
