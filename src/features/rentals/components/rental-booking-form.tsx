"use client";

import Link from "next/link";
import { CalendarClock, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { ConsentCheckbox } from "@/components/shared/consent-checkbox";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIVACY_POLICY_VERSION } from "@/config/legal";
import { documentTypes } from "@/features/checkout/lib/schema";
import { startPayment } from "@/features/payments/actions";
import { PaymentModeNotice } from "@/features/payments/components/payment-mode-notice";
import { resolveCheckoutTarget } from "@/features/payments/lib/checkout-url";
import { useActionForm } from "@/hooks/use-action-form";
import { formatCOP } from "@/lib/format";
import type { PaymentConfig, RentalOffer, RentalQuote, User } from "@/types";
import { bookRental, quoteRental } from "../actions";
import { durationLabels } from "../lib/labels";
import { bogotaIso, timeOptions } from "../lib/offers";
import { rentalBookingSchema } from "../lib/schema";

interface RentalBookingFormProps {
  offer: RentalOffer;
  user: User | null;
  minDate: string;
  paymentConfig?: PaymentConfig | null;
}

type QuoteState = { kind: "idle" } | { kind: "loading" } | { kind: "ok"; quote: RentalQuote } | { kind: "error"; message: string };

const TIMES = timeOptions();

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded-3xl border border-border bg-card p-6 sm:p-8">
      <legend className="font-display-tight float-left mb-5 w-full text-xl">{title}</legend>
      <div className="clear-both space-y-5">{children}</div>
    </fieldset>
  );
}

function TimeSelect({ id, value, onChange, label }: { id: string; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={label} className="w-full">
        <SelectValue placeholder="Hora" />
      </SelectTrigger>
      <SelectContent>
        {TIMES.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Reserva de alquiler: periodo con cotización en vivo, datos del cliente y pago en línea. */
export function RentalBookingForm({ offer, user, minDate, paymentConfig = null }: RentalBookingFormProps) {
  const [branchId, setBranchId] = useState(offer.branches[0]?.branchId ?? "");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("13:00");
  const [documentType, setDocumentType] = useState("CC");
  const [quote, setQuote] = useState<QuoteState>({ kind: "idle" });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const startAt = startDate ? bogotaIso(startDate, startTime) : "";
  const endAt = endDate ? bogotaIso(endDate, endTime) : "";

  // Cotización en vivo (con pausa para no consultar en cada tecla).
  useEffect(() => {
    if (!branchId || !startAt || !endAt) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setQuote({ kind: "loading" });
      const result = await quoteRental({ productId: offer.productId, branchId, startAt, endAt });
      if (cancelled) return;
      setQuote(result.ok ? { kind: "ok", quote: result.data } : { kind: "error", message: result.message });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [offer.productId, branchId, startAt, endAt]);

  const form = useActionForm(rentalBookingSchema, bookRental, {
    async onSuccess(rental) {
      setRedirecting(true);
      const result = await startPayment({ rentalId: rental.id });
      const target = result.ok ? resolveCheckoutTarget(result.data.checkoutUrl) : null;
      if (target) {
        window.location.assign(target);
        return;
      }
      setRedirecting(false);
      setPaymentError(result.ok ? "No pudimos abrir la pasarela de pagos." : result.message);
    },
  });
  const errors = form.fieldErrors;
  const quoteOk = quote.kind === "ok" ? quote.quote : null;
  const canBook = Boolean(user) && quoteOk !== null && quoteOk.availableUnits > 0;

  if (form.data) {
    return (
      <div role="status" className="mx-auto max-w-xl space-y-4 rounded-3xl border border-border bg-card p-8 text-center">
        <CalendarClock className="mx-auto size-12 text-volt-strong" aria-hidden="true" />
        <h2 className="font-display-tight text-2xl">{redirecting ? "Te llevamos a la pasarela de pago…" : "Unidad apartada"}</h2>
        <p className="text-muted-foreground">
          {form.data.productName}, unidad {form.data.unitCode}, en {form.data.branchName}. Total {formatCOP(form.data.price)}.
        </p>
        {paymentError && (
          <p role="alert" className="text-sm text-destructive">
            {paymentError} Puedes pagar desde Mis alquileres antes de que venza el plazo.
          </p>
        )}
        {!redirecting && (
          <Button asChild size="xl" variant="brand">
            <Link href={`/cuenta/alquileres/${form.data.id}`}>Ver mi alquiler</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      noValidate
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (name: string) => String(data.get(name) ?? "");
        form.submit(
          {
            productId: offer.productId,
            branchId,
            startAt,
            endAt,
            customer: {
              fullName: text("fullName"),
              email: text("email"),
              phone: text("phone"),
              documentType,
              documentNumber: text("documentNumber"),
            },
            dataConsent: data.get("dataConsent") === "true",
            policyVersion: PRIVACY_POLICY_VERSION,
          },
          event.currentTarget,
        );
      }}
    >
      <div className="min-w-0 space-y-6">
        {form.formError && <FormAlert variant="error">{form.formError}</FormAlert>}

        <Fieldset title="Sucursal y horario">
          <FormField id="rt-branch" label="Sucursal" error={errors.branchId}>
            {(control) => (
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger {...control} className="w-full">
                  <SelectValue placeholder="Elige la sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {offer.branches.map((branch) => (
                    <SelectItem key={branch.branchId} value={branch.branchId}>
                      {branch.branchCity}, {branch.branchName} ({branch.units} en flota)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <FormField id="rt-start-date" label="Recogida" error={errors.startAt}>
                {(control) => (
                  <Input {...control} type="date" min={minDate} value={startDate} onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
                  }} />
                )}
              </FormField>
              <TimeSelect id="rt-start-time" label="Hora de recogida" value={startTime} onChange={setStartTime} />
            </div>
            <div className="space-y-2">
              <FormField id="rt-end-date" label="Devolución" error={errors.endAt}>
                {(control) => (
                  <Input {...control} type="date" min={startDate || minDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                )}
              </FormField>
              <TimeSelect id="rt-end-time" label="Hora de devolución" value={endTime} onChange={setEndTime} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Recoge y devuelve dentro del horario de la sucursal. Mínimo una hora, máximo 14 días.
          </p>
        </Fieldset>

        {user ? (
          <Fieldset title="Tus datos">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="rt-name" label="Nombre completo" error={errors["customer.fullName"]} className="sm:col-span-2">
                {(control) => (
                  <Input {...control} name="fullName" autoComplete="name" maxLength={100} defaultValue={`${user.firstName} ${user.lastName}`} />
                )}
              </FormField>
              <FormField id="rt-email" label="Correo electrónico" hint="Aquí te enviaremos la factura." error={errors["customer.email"]}>
                {(control) => <Input {...control} name="email" type="email" autoComplete="email" maxLength={150} defaultValue={user.email} />}
              </FormField>
              <FormField id="rt-phone" label="Celular" error={errors["customer.phone"]}>
                {(control) => <Input {...control} name="phone" type="tel" autoComplete="tel" maxLength={20} defaultValue={user.phone} />}
              </FormField>
              <FormField id="rt-doctype" label="Tipo de documento" error={errors["customer.documentType"]}>
                {(control) => (
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger {...control} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
              <FormField id="rt-docnumber" label="Número de documento" error={errors["customer.documentNumber"]}>
                {(control) => <Input {...control} name="documentNumber" maxLength={20} defaultValue={user.documentNumber} />}
              </FormField>
            </div>
            <ConsentCheckbox id="rt-consent" error={errors.dataConsent} />
          </Fieldset>
        ) : (
          <FormAlert variant="info">
            Puedes consultar precio y disponibilidad sin cuenta. Para reservar,{" "}
            <Link href={`/login?next=/alquiler/${offer.slug}`} className="font-medium underline underline-offset-4">
              inicia sesión
            </Link>{" "}
            o{" "}
            <Link href={`/registro?next=/alquiler/${offer.slug}`} className="font-medium underline underline-offset-4">
              crea una cuenta
            </Link>
            .
          </FormAlert>
        )}
      </div>

      <aside className="space-y-4 rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-24" aria-live="polite">
        <h2 className="font-display-tight text-xl">Tu alquiler</h2>
        <dl className="grid grid-cols-2 gap-2">
          {offer.rates.map((rate) => (
            <div key={rate.unit} className="rounded-xl bg-muted px-3 py-2">
              <dt className="text-xs text-muted-foreground">Por {durationLabels[rate.unit].per}</dt>
              <dd className="tabular font-semibold">{formatCOP(rate.price)}</dd>
            </div>
          ))}
        </dl>
        {quote.kind === "idle" && <p className="text-sm text-muted-foreground">Elige las fechas para ver el precio y si hay unidades libres.</p>}
        {quote.kind === "loading" && <p className="text-sm text-muted-foreground">Consultando disponibilidad…</p>}
        {quote.kind === "error" && (
          <p role="alert" className="text-sm text-destructive">
            {quote.message}
          </p>
        )}
        {quoteOk && (
          <div className="space-y-1 border-t border-border pt-4">
            <p className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {quoteOk.hours} {quoteOk.hours === 1 ? "hora" : "horas"}, tarifa por {quoteOk.pricing === "dia" ? "día" : "hora"}
              </span>
            </p>
            <p className="flex items-baseline justify-between text-lg font-semibold">
              <span>Total</span>
              <span className="tabular">{formatCOP(quoteOk.price)}</span>
            </p>
            <p className={quoteOk.availableUnits > 0 ? "text-sm text-volt-strong" : "text-sm text-destructive"}>
              {quoteOk.availableUnits > 0
                ? `${quoteOk.availableUnits} ${quoteOk.availableUnits === 1 ? "unidad libre" : "unidades libres"} para esas fechas`
                : "No hay unidades libres para esas fechas. Prueba otro horario o sucursal."}
            </p>
          </div>
        )}
        <Button type="submit" size="xl" variant="brand" className="w-full" disabled={!canBook || form.isPending || redirecting}>
          {form.isPending ? "Apartando la unidad…" : "Reservar y pagar"}
        </Button>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Pagas en la pasarela de pagos. Apartamos la unidad por un tiempo limitado mientras completas el pago.
        </p>
        <PaymentModeNotice config={paymentConfig} />
      </aside>
    </form>
  );
}
