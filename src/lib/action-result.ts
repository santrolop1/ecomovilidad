import type { z } from "zod";
import { getErrorMessage } from "@/lib/api/errors";

export type FieldErrors = Record<string, string>;

/** Resultado serializable de una Server Action. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

/** Primer error por campo, con la ruta unida por puntos ("customer.email"). */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

/**
 * Valida en el servidor (nunca confiar solo en la validación del cliente) y
 * ejecuta la operación, normalizando errores para la UI.
 */
export async function runAction<Schema extends z.ZodType, T>(
  schema: Schema,
  input: unknown,
  operation: (data: z.infer<Schema>) => Promise<T>,
): Promise<ActionResult<T>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error);
    // Esquemas de un solo valor (p. ej. una cantidad) no tienen campos: se usa su mensaje.
    if (Object.keys(fieldErrors).length === 0) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "El valor no es válido." };
    }
    return { ok: false, message: "Revisa los campos marcados.", fieldErrors };
  }
  try {
    return { ok: true, data: await operation(parsed.data) };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}
