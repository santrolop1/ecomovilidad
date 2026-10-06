"use client";

import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { ConsentCheckbox } from "@/components/shared/consent-checkbox";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";
import { formDataToObject } from "@/lib/validation";
import { sendContactMessage } from "../actions";
import { contactSchema, contactTopics } from "../lib/schema";

type Topic = (typeof contactTopics)[number]["value"];

interface ContactFormProps {
  defaultTopic?: Topic;
  defaultMessage?: string;
}

export function ContactForm({ defaultTopic, defaultMessage }: ContactFormProps) {
  const [topic, setTopic] = useState<Topic | "">(defaultTopic ?? "");
  const form = useActionForm(contactSchema, sendContactMessage);

  if (form.data) {
    return (
      <div role="status" className="rounded-3xl border border-border bg-card p-8 text-center">
        <CircleCheck className="mx-auto size-10 text-volt-strong" aria-hidden="true" />
        <h2 className="font-display-tight mt-4 text-2xl">Mensaje enviado</h2>
        <p className="mt-2 text-muted-foreground">Te responderemos al correo que nos dejaste.</p>
        <Button variant="outline" size="lg" className="mt-6 rounded-full" onClick={form.reset}>
          Enviar otro mensaje
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-5 rounded-3xl border border-border bg-card p-6 sm:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit(formDataToObject(new FormData(event.currentTarget), ["dataConsent"]), event.currentTarget);
      }}
    >
      {form.formError && <FormAlert variant="error">{form.formError}</FormAlert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="contact-name" label="Nombre completo" error={form.fieldErrors.fullName}>
          {(control) => <Input {...control} name="fullName" autoComplete="name" maxLength={100} />}
        </FormField>
        <FormField id="contact-email" label="Correo electrónico" error={form.fieldErrors.email}>
          {(control) => <Input {...control} name="email" type="email" autoComplete="email" maxLength={150} />}
        </FormField>
        <FormField id="contact-phone" label="Teléfono (opcional)" error={form.fieldErrors.phone}>
          {(control) => <Input {...control} name="phone" type="tel" autoComplete="tel" maxLength={20} />}
        </FormField>
        <FormField id="contact-topic" label="Tema" error={form.fieldErrors.topic}>
          {(control) => (
            <>
              <Select value={topic} onValueChange={(value) => setTopic(value as Topic)}>
                <SelectTrigger {...control} className="w-full">
                  <SelectValue placeholder="Elige un tema" />
                </SelectTrigger>
                <SelectContent>
                  {contactTopics.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="topic" value={topic} />
            </>
          )}
        </FormField>
      </div>
      <FormField id="contact-message" label="Mensaje" error={form.fieldErrors.message}>
        {(control) => (
          <Textarea {...control} name="message" rows={5} maxLength={2000} defaultValue={defaultMessage} className="resize-y" />
        )}
      </FormField>
      <ConsentCheckbox id="contact-consent" error={form.fieldErrors.dataConsent} />
      <Button type="submit" size="xl" variant="brand" disabled={form.isPending} className="w-full sm:w-auto">
        {form.isPending ? "Enviando…" : "Enviar mensaje"}
      </Button>
    </form>
  );
}
