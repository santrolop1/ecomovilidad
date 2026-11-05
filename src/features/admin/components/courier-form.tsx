"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionForm } from "@/hooks/use-action-form";
import { formDataToObject } from "@/lib/validation";
import { createCourier, setCourierActive } from "../actions";
import { courierFormSchema } from "../lib/schemas";

export function CourierForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useActionForm(courierFormSchema, createCourier, {
    onSuccess() {
      toast.success("Domiciliario agregado.");
      formRef.current?.reset();
      router.refresh();
    },
  });
  return (
    <form
      ref={formRef}
      noValidate
      className="grid items-start gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit(formDataToObject(new FormData(event.currentTarget)), event.currentTarget);
      }}
    >
      {form.formError && <div className="sm:col-span-3"><FormAlert variant="error">{form.formError}</FormAlert></div>}
      <FormField id="c-name" label="Nombre" error={form.fieldErrors.name}>
        {(control) => <Input {...control} name="name" maxLength={120} />}
      </FormField>
      <FormField id="c-phone" label="Teléfono" error={form.fieldErrors.phone}>
        {(control) => <Input {...control} name="phone" inputMode="tel" maxLength={20} />}
      </FormField>
      <Button type="submit" className="h-10 rounded-full sm:mt-6" disabled={form.isPending}>
        Agregar
      </Button>
    </form>
  );
}

export function CourierToggle({ id, isActive, name }: { id: string; isActive: boolean; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      disabled={isPending}
      aria-label={`${isActive ? "Desactivar" : "Activar"} a ${name}`}
      onClick={() =>
        startTransition(async () => {
          const result = await setCourierActive(id, !isActive);
          if (result.ok) router.refresh();
          else toast.error(result.message);
        })
      }
    >
      {isActive ? "Desactivar" : "Activar"}
    </Button>
  );
}
