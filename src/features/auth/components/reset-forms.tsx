"use client";

import Link from "next/link";
import { useState } from "react";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionForm } from "@/hooks/use-action-form";
import { formDataToObject } from "@/lib/validation";
import { confirmPasswordReset, requestPasswordReset } from "../actions";
import { PASSWORD_MIN_LENGTH, resetConfirmSchema, resetRequestSchema } from "../lib/schemas";
import { PasswordInput } from "./password-input";

export function ResetRequestForm() {
  const [sent, setSent] = useState(false);
  const form = useActionForm(resetRequestSchema, requestPasswordReset, { onSuccess: () => setSent(true) });
  if (sent) {
    return (
      <FormAlert variant="success">
        Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña. Vence en 30 minutos.
      </FormAlert>
    );
  }
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit(formDataToObject(new FormData(event.currentTarget)), event.currentTarget);
      }}
    >
      {form.formError && <FormAlert variant="error">{form.formError}</FormAlert>}
      <FormField id="reset-email" label="Correo de tu cuenta" error={form.fieldErrors.email}>
        {(c) => <Input {...c} name="email" type="email" autoComplete="email" maxLength={150} />}
      </FormField>
      <Button type="submit" size="xl" variant="brand" className="w-full" disabled={form.isPending}>
        {form.isPending ? "Enviando…" : "Enviar enlace"}
      </Button>
    </form>
  );
}

export function ResetConfirmForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const form = useActionForm(resetConfirmSchema, confirmPasswordReset, { onSuccess: () => setDone(true) });
  if (done) {
    return (
      <div className="space-y-4">
        <FormAlert variant="success">Tu contraseña se actualizó y cerramos las sesiones abiertas.</FormAlert>
        <Button asChild size="xl" variant="brand" className="w-full">
          <Link href="/login">Ingresar</Link>
        </Button>
      </div>
    );
  }
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit({ ...formDataToObject(new FormData(event.currentTarget)), token }, event.currentTarget);
      }}
    >
      {(form.formError || form.fieldErrors.token) && (
        <FormAlert variant="error">
          {form.fieldErrors.token ?? form.formError}{" "}
          <Link href="/recuperar" className="font-medium underline underline-offset-4">
            Solicitar otro enlace
          </Link>
        </FormAlert>
      )}
      <FormField
        id="reset-new"
        label="Nueva contraseña"
        hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres, con letras y números.`}
        error={form.fieldErrors.newPassword}
      >
        {(c) => <PasswordInput {...c} name="newPassword" autoComplete="new-password" maxLength={128} />}
      </FormField>
      <FormField id="reset-confirm" label="Confirma la contraseña" error={form.fieldErrors.confirmPassword}>
        {(c) => <PasswordInput {...c} name="confirmPassword" autoComplete="new-password" maxLength={128} />}
      </FormField>
      <Button type="submit" size="xl" variant="brand" className="w-full" disabled={form.isPending}>
        {form.isPending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
