import { z } from "zod";

/** Reglas compartidas de validación de formularios (cliente y servidor). */
export const fullNameField = z
  .string()
  .trim()
  .min(3, "Escribe tu nombre completo.")
  .max(100, "El nombre es demasiado largo.");

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(150, "El correo es demasiado largo.")
  .pipe(z.email("Escribe un correo válido, por ejemplo nombre@correo.com."));

export const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[\d\s()-]{7,20}$/, "Escribe un teléfono válido, por ejemplo 300 123 4567.");

export const consentField = z.literal(true, {
  error: "Necesitamos tu autorización para tratar tus datos.",
});

/** Lee un FormData como objeto plano; los checkboxes se convierten a booleano. */
export function formDataToObject(formData: FormData, booleanFields: string[] = []): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  for (const field of booleanFields) values[field] = formData.get(field) === "true" || formData.get(field) === "on";
  return values;
}
