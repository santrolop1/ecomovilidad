"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ConsentCheckbox } from "@/components/shared/consent-checkbox";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionForm } from "@/hooks/use-action-form";
import { formDataToObject } from "@/lib/validation";
import { register } from "../actions";
import { sessionQueryKey } from "../use-session";
import { PASSWORD_MIN_LENGTH, registerSchema } from "../lib/schemas";
import { PasswordInput } from "./password-input";

export function RegisterForm({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useActionForm(registerSchema, register, {
    onSuccess(user) {
      queryClient.setQueryData(sessionQueryKey, user);
      router.push(next);
    },
  });

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit(formDataToObject(new FormData(event.currentTarget), ["dataConsent"]), event.currentTarget);
      }}
    >
      {form.formError && <FormAlert variant="info">{form.formError}</FormAlert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="register-first-name" label="Nombres" error={form.fieldErrors.firstName}>
          {(control) => <Input {...control} name="firstName" autoComplete="given-name" maxLength={80} />}
        </FormField>
        <FormField id="register-last-name" label="Apellidos" error={form.fieldErrors.lastName}>
          {(control) => <Input {...control} name="lastName" autoComplete="family-name" maxLength={80} />}
        </FormField>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="register-email" label="Correo electrónico" error={form.fieldErrors.email}>
          {(control) => <Input {...control} name="email" type="email" autoComplete="email" maxLength={150} />}
        </FormField>
        <FormField id="register-phone" label="Celular" error={form.fieldErrors.phone}>
          {(control) => <Input {...control} name="phone" type="tel" autoComplete="tel" maxLength={20} />}
        </FormField>
      </div>
      <FormField
        id="register-password"
        label="Contraseña"
        hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres, con letras y números.`}
        error={form.fieldErrors.password}
      >
        {(control) => <PasswordInput {...control} name="password" autoComplete="new-password" maxLength={128} />}
      </FormField>
      <FormField id="register-confirm" label="Confirma la contraseña" error={form.fieldErrors.confirmPassword}>
        {(control) => <PasswordInput {...control} name="confirmPassword" autoComplete="new-password" maxLength={128} />}
      </FormField>
      <ConsentCheckbox id="register-consent" error={form.fieldErrors.dataConsent} />
      <Button type="submit" size="xl" variant="brand" className="w-full" disabled={form.isPending}>
        {form.isPending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline underline-offset-4">
          Ingresa
        </Link>
      </p>
    </form>
  );
}
