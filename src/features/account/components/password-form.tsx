"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { changePassword } from "@/features/auth/actions";
import { PasswordInput } from "@/features/auth/components/password-input";
import { changePasswordSchema, PASSWORD_MIN_LENGTH } from "@/features/auth/lib/schemas";
import { useActionForm } from "@/hooks/use-action-form";
import { formDataToObject } from "@/lib/validation";

export function PasswordForm() {
  // Cambiar la key vacía los campos después de un cambio exitoso.
  const [version, setVersion] = useState(0);
  const form = useActionForm(changePasswordSchema, changePassword, {
    onSuccess() {
      toast.success("Contraseña actualizada. Cerramos tus sesiones en otros dispositivos.");
      setVersion((v) => v + 1);
    },
  });
  return (
    <form
      key={version}
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit(formDataToObject(new FormData(event.currentTarget)), event.currentTarget);
      }}
    >
      {form.formError && <FormAlert variant="error">{form.formError}</FormAlert>}
      <FormField id="pw-current" label="Contraseña actual" error={form.fieldErrors.currentPassword}>
        {(c) => <PasswordInput {...c} name="currentPassword" autoComplete="current-password" maxLength={128} />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="pw-new"
          label="Nueva contraseña"
          hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres, con letras y números.`}
          error={form.fieldErrors.newPassword}
        >
          {(c) => <PasswordInput {...c} name="newPassword" autoComplete="new-password" maxLength={128} />}
        </FormField>
        <FormField id="pw-confirm" label="Confirma la nueva contraseña" error={form.fieldErrors.confirmPassword}>
          {(c) => <PasswordInput {...c} name="confirmPassword" autoComplete="new-password" maxLength={128} />}
        </FormField>
      </div>
      <Button type="submit" size="xl" variant="outline" disabled={form.isPending}>
        {form.isPending ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
