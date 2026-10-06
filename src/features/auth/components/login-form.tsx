"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionForm } from "@/hooks/use-action-form";
import { formDataToObject } from "@/lib/validation";
import { login } from "../actions";
import { sessionQueryKey } from "../use-session";
import { loginSchema } from "../lib/schemas";
import { PasswordInput } from "./password-input";

export function LoginForm({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useActionForm(loginSchema, login, {
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
        form.submit(formDataToObject(new FormData(event.currentTarget)), event.currentTarget);
      }}
    >
      {form.formError && <FormAlert variant="info">{form.formError}</FormAlert>}
      <FormField id="login-email" label="Correo electrónico" error={form.fieldErrors.email}>
        {(control) => <Input {...control} name="email" type="email" autoComplete="email" maxLength={150} />}
      </FormField>
      <FormField id="login-password" label="Contraseña" error={form.fieldErrors.password}>
        {(control) => <PasswordInput {...control} name="password" autoComplete="current-password" maxLength={128} />}
      </FormField>
      <p className="-mt-2 text-right text-sm">
        <Link href="/recuperar" className="underline underline-offset-4">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
      <Button type="submit" size="xl" variant="brand" className="w-full" disabled={form.isPending}>
        {form.isPending ? "Ingresando…" : "Ingresar"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href={next === "/" ? "/registro" : `/registro?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline underline-offset-4">
          Crea una
        </Link>
      </p>
    </form>
  );
}
