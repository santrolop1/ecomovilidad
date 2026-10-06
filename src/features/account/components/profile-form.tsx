"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/features/auth/actions";
import { profileSchema } from "@/features/auth/lib/schemas";
import { sessionQueryKey } from "@/features/auth/use-session";
import { useActionForm } from "@/hooks/use-action-form";
import { formDataToObject } from "@/lib/validation";
import type { User } from "@/types";

export function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useActionForm(profileSchema, updateProfile, {
    onSuccess(updated) {
      queryClient.setQueryData(sessionQueryKey, updated);
      toast.success("Datos actualizados.");
      router.refresh();
    },
  });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit(formDataToObject(new FormData(event.currentTarget)), event.currentTarget);
      }}
    >
      {form.formError && <FormAlert variant="error">{form.formError}</FormAlert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="pf-first" label="Nombres" error={form.fieldErrors.firstName}>
          {(c) => <Input {...c} name="firstName" defaultValue={user.firstName} autoComplete="given-name" maxLength={80} />}
        </FormField>
        <FormField id="pf-last" label="Apellidos" error={form.fieldErrors.lastName}>
          {(c) => <Input {...c} name="lastName" defaultValue={user.lastName} autoComplete="family-name" maxLength={80} />}
        </FormField>
        <FormField id="pf-phone" label="Celular" error={form.fieldErrors.phone}>
          {(c) => <Input {...c} name="phone" type="tel" defaultValue={user.phone} autoComplete="tel" maxLength={20} />}
        </FormField>
        <FormField id="pf-doc" label="Número de documento (opcional)" error={form.fieldErrors.documentNumber}>
          {(c) => <Input {...c} name="documentNumber" defaultValue={user.documentNumber ?? ""} maxLength={20} />}
        </FormField>
      </div>
      <p className="text-sm text-muted-foreground">
        Correo de la cuenta: <span className="font-medium text-foreground">{user.email}</span> (no se puede cambiar desde aquí).
      </p>
      <Button type="submit" size="xl" variant="brand" disabled={form.isPending}>
        {form.isPending ? "Guardando…" : "Guardar datos"}
      </Button>
    </form>
  );
}
