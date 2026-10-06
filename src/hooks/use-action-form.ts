"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { z } from "zod";
import { type ActionResult, type FieldErrors, toFieldErrors } from "@/lib/action-result";

const GENERIC_ERROR = "No pudimos enviar el formulario. Revisa tu conexión e inténtalo de nuevo.";

/**
 * Valida en el cliente con el mismo esquema Zod del servidor y ejecuta la
 * Server Action mediante TanStack Query (estados de carga y error uniformes).
 */
export function useActionForm<Schema extends z.ZodType, T>(
  schema: Schema,
  /** Recibe la entrada ORIGINAL: el servidor la valida con el mismo esquema. */
  action: (input: unknown) => Promise<ActionResult<T>>,
  options: { onSuccess?: (data: T) => void } = {},
) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const mutation = useMutation({ mutationFn: action });

  function focusFirstInvalid(form: HTMLFormElement) {
    requestAnimationFrame(() => {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
  }

  /** `form` se usa para llevar el foco al primer campo con error. */
  function submit(values: unknown, form: HTMLFormElement) {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      focusFirstInvalid(form);
      return;
    }
    setFieldErrors({});
    // Se envía `values`, no `parsed.data`: los esquemas con transformaciones no
    // son idempotentes y el servidor debe validar exactamente lo que llegó.
    mutation.mutate(values, {
      onSuccess(result) {
        if (result.ok) options.onSuccess?.(result.data);
        else if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
          focusFirstInvalid(form);
        }
      },
    });
  }

  const result = mutation.data;
  const formError = result && !result.ok ? result.message : mutation.isError ? GENERIC_ERROR : undefined;

  return {
    submit,
    fieldErrors,
    formError,
    isPending: mutation.isPending,
    data: result?.ok ? result.data : undefined,
    reset: () => {
      setFieldErrors({});
      mutation.reset();
    },
  };
}
