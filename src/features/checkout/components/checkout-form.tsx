"use client";

import Link from "next/link";
import { CircleCheck, Lock, ShoppingBag, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ConsentCheckbox } from "@/components/shared/consent-checkbox";
import { EmptyState } from "@/components/shared/empty-state";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/use-session";
import { useCart } from "@/features/cart/cart-provider";
import { OrderSummary } from "@/features/cart/components/order-summary";
import { ReservationTimer } from "@/features/cart/components/reservation-timer";
import { reservationState } from "@/features/cart/lib/reservation";
import { PRIVACY_POLICY_VERSION } from "@/config/legal";
import { useNow } from "@/hooks/use-now";
import { useActionForm } from "@/hooks/use-action-form";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Branch, FulfillmentMethod, PaymentConfig, TimeSlot } from "@/types";
import { createOrder, loadTimeSlots } from "../actions";
import { startPayment } from "@/features/payments/actions";
import { PayButton } from "@/features/payments/components/pay-button";
import { PaymentModeNotice } from "@/features/payments/components/payment-mode-notice";
import { resolveCheckoutTarget } from "@/features/payments/lib/checkout-url";
import { checkoutSchema, documentTypes, serviceAreaCities } from "../lib/schema";

interface CheckoutFormProps {
  branches: Branch[];
  timeSlots: TimeSlot[];
  minDate: string;
  /** Con el backend real, comprar exige una cuenta (el pedido queda asociado al usuario). */
  requiresAccount: boolean;
  /** Para avisar si los pagos son de prueba (pasarela simulada o Wompi sandbox). */
  paymentConfig?: PaymentConfig | null;
}

function Fieldset({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded-3xl border border-border bg-card p-6 sm:p-8">
      {/* La legend flotante evita que el navegador la dibuje sobre el borde. */}
      <legend className="font-display-tight float-left mb-5 w-full text-xl">{title}</legend>
      <div className="clear-both space-y-5">{children}</div>
    </fieldset>
  );
}

function ChoiceCard({ value, id, title, description }: { value: string; id: string; title: string; description?: string }) {
  return (
    <Label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4 font-normal transition-colors has-data-[state=checked]:border-ink has-data-[state=checked]:bg-muted"
    >
      <RadioGroupItem value={value} id={id} className="mt-0.5" />
      <span>
        <span className="block font-medium">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>}
      </span>
    </Label>
  );
}

export function CheckoutForm({ branches, timeSlots: initialSlots, minDate, requiresAccount, paymentConfig = null }: CheckoutFormProps) {
  const { cart, isReady, isRemote, itemCount, subtotal, total, completeOrder, refresh } = useCart();
  const { user } = useSession();
  const [city, setCity] = useState("");
  const [method, setMethod] = useState<FulfillmentMethod>("domicilio");
  const [branchId, setBranchId] = useState("");
  const [timeSlotId, setTimeSlotId] = useState("");
  const [date, setDate] = useState(minDate);
  const [timeSlots, setTimeSlots] = useState(initialSlots);
  // Tras crear el pedido se abre la pasarela; si no se puede, el cliente paga desde aquí o desde Mis pedidos.
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [documentType, setDocumentType] = useState("CC");
  const form = useActionForm(checkoutSchema, createOrder, {
    async onSuccess(order) {
      completeOrder();
      if (!isRemote) return; // sin backend no hay pagos en línea
      setRedirecting(true);
      const result = await startPayment({ orderId: order.id });
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

  // RF 6.2: el checkout revalida la reserva con el servidor al entrar y cuando
  // el pedido es rechazado; sin reserva vigente no se puede confirmar.
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);
  useEffect(() => {
    refreshRef.current();
  }, []);
  useEffect(() => {
    if (form.formError) refreshRef.current();
  }, [form.formError]);
  // CU-06: el cupo depende del día y, si recoge, de la sucursal.
  const slotBranchId = method === "recogida" ? branchId || undefined : undefined;
  useEffect(() => {
    if (!date) return;
    let current = true;
    loadTimeSlots({ date, branchId: slotBranchId }).then((result) => {
      if (!current || !result.ok) return;
      setTimeSlots(result.data);
      setTimeSlotId((selected) => (result.data.some((s) => s.id === selected && s.available) ? selected : ""));
    });
    return () => {
      current = false;
    };
  }, [date, slotBranchId]);
  const now = useNow(1000, isRemote);
  const reservation = isRemote ? reservationState(cart, now) : null;
  const reservationBlocked = reservation !== null && reservation.kind !== "active";

  const pickupBranches = branches.filter((branch) => branch.services.includes("recogida"));

  if (form.data) {
    if (redirecting) {
      return (
        <div role="status" className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-8 text-center">
          <Lock className="mx-auto size-10 text-volt-strong" aria-hidden="true" />
          <h2 className="font-display-tight mt-4 text-2xl">Te llevamos a la pasarela de pago…</h2>
          <p className="mt-3 text-muted-foreground">Pedido #{form.data.id.slice(0, 8).toUpperCase()}, total {formatCOP(form.data.total)}.</p>
        </div>
      );
    }
    return (
      <div role="status" className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-8 text-center">
        <CircleCheck className="mx-auto size-12 text-volt-strong" aria-hidden="true" />
        <h2 className="font-display-tight mt-4 text-2xl">Pedido #{form.data.id.slice(0, 8).toUpperCase()} creado</h2>
        <p className="mt-3 text-muted-foreground">
          Total {formatCOP(form.data.total)}. Está pendiente de pago: apartamos las unidades por un tiempo limitado.
        </p>
        {!isRemote && <p className="mt-2 text-sm text-muted-foreground">Los pagos en línea requieren el backend (modo de demostración).</p>}
        {paymentError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {paymentError}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {isRemote && <PayButton target={{ orderId: form.data.id }} />}
          {isRemote && (
            <Button asChild size="xl" variant="outline">
              <Link href={`/cuenta/pedidos/${form.data.id}`}>Ver mi pedido</Link>
            </Button>
          )}
          <Button asChild size="xl" variant="outline">
            <Link href="/catalogo">Volver al catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]" aria-busy="true">
        <span className="sr-only">Cargando checkout…</span>
        <Skeleton className="h-[520px] rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (requiresAccount && !user) {
    return (
      <EmptyState
        icon={UserRound}
        title="Inicia sesión para finalizar tu compra"
        description="Tu pedido queda asociado a tu cuenta. Los productos de tu carrito se conservan al ingresar."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="xl" variant="brand">
              <Link href="/login?next=/checkout">Ingresar</Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="/registro?next=/checkout">Crear cuenta</Link>
            </Button>
          </div>
        }
      />
    );
  }

  if (cart.items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="No hay productos para pagar"
        description="Agrega productos al carrito para continuar con el pago."
        action={
          <Button asChild size="xl" variant="brand">
            <Link href="/catalogo">Explorar vehículos</Link>
          </Button>
        }
      />
    );
  }

  return (
    <form
      noValidate
      className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (name: string) => String(data.get(name) ?? "");
        form.submit({
          items: cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          customer: {
            fullName: text("fullName"),
            email: text("email"),
            phone: text("phone"),
            documentType,
            documentNumber: text("documentNumber"),
          },
          fulfillment: {
            method,
            address: method === "domicilio" ? text("address") : undefined,
            city: method === "domicilio" ? city || undefined : undefined,
            branchId: method === "recogida" ? branchId || undefined : undefined,
            date: text("date"),
            timeSlotId,
          },
          dataConsent: data.get("dataConsent") === "true",
          policyVersion: PRIVACY_POLICY_VERSION,
        }, event.currentTarget);
      }}
    >
      <div className="min-w-0 space-y-6">
        {form.formError && <FormAlert variant="error">{form.formError}</FormAlert>}
        {reservation?.kind === "active" && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <ReservationTimer until={reservation.expiresAt} onExpire={() => refreshRef.current()} />
            <p className="mt-1 text-sm text-muted-foreground">
              Si el tiempo se acaba, liberamos las unidades y tendrás que agregarlas de nuevo.
            </p>
          </div>
        )}
        {reservationBlocked && (
          <FormAlert variant="error">
            La reserva de tu carrito venció. Vuelve al{" "}
            <Link href="/carrito" className="font-medium underline underline-offset-4">
              carrito
            </Link>{" "}
            y agrega los productos de nuevo para confirmar el pedido.
          </FormAlert>
        )}

        <Fieldset title="Tus datos">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="co-name" label="Nombre completo" error={errors["customer.fullName"]} className="sm:col-span-2">
              {(control) => (
                <Input
                  {...control}
                  name="fullName"
                  autoComplete="name"
                  maxLength={100}
                  defaultValue={user ? `${user.firstName} ${user.lastName}` : undefined}
                />
              )}
            </FormField>
            <FormField id="co-email" label="Correo electrónico" hint="Aquí te enviaremos la factura electrónica." error={errors["customer.email"]}>
              {(control) => (
                <Input {...control} name="email" type="email" autoComplete="email" maxLength={150} defaultValue={user?.email} />
              )}
            </FormField>
            <FormField id="co-phone" label="Celular" error={errors["customer.phone"]}>
              {(control) => (
                <Input {...control} name="phone" type="tel" autoComplete="tel" maxLength={20} defaultValue={user?.phone} />
              )}
            </FormField>
            <FormField id="co-doctype" label="Tipo de documento" error={errors["customer.documentType"]}>
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
            <FormField id="co-docnumber" label="Número de documento" error={errors["customer.documentNumber"]}>
              {(control) => (
                <Input {...control} name="documentNumber" inputMode="text" maxLength={20} defaultValue={user?.documentNumber} />
              )}
            </FormField>
          </div>
        </Fieldset>

        <Fieldset title="Entrega">
          <RadioGroup
            value={method}
            onValueChange={(value) => setMethod(value as FulfillmentMethod)}
            className="grid gap-3 sm:grid-cols-2"
            aria-label="Método de entrega"
          >
            <ChoiceCard id="co-domicilio" value="domicilio" title="Domicilio" description="Con seguimiento en el mapa." />
            <ChoiceCard id="co-recogida" value="recogida" title="Recoger en sucursal" description="Sin costo de envío." />
          </RadioGroup>

          {method === "domicilio" ? (
            <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
              <FormField id="co-address" label="Dirección" error={errors["fulfillment.address"]}>
                {(control) => (
                  <Input {...control} name="address" autoComplete="street-address" placeholder="Calle 00 # 00-00, apto" maxLength={160} />
                )}
              </FormField>
              <FormField id="co-city" label="Municipio" error={errors["fulfillment.city"]}>
                {(control) => (
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger {...control} className="w-full">
                      <SelectValue placeholder="Elige" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceAreaCities.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            </div>
          ) : (
            <FormField id="co-branch" label="Sucursal de recogida" error={errors["fulfillment.branchId"]}>
              {(control) => (
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger {...control} className="w-full">
                    <SelectValue placeholder="Elige una sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {pickupBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.city}, {branch.name} ({branch.address})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
          )}

          <FormField id="co-date" label="Fecha" error={errors["fulfillment.date"]} className="max-w-xs">
            {(control) => <Input {...control} name="date" type="date" min={minDate} defaultValue={minDate} onChange={(e) => setDate(e.target.value)} />}
          </FormField>

          <div className="space-y-2">
            <p id="co-slots-label" className="text-sm font-medium">
              Franja horaria
            </p>
            <RadioGroup
              value={timeSlotId}
              onValueChange={setTimeSlotId}
              aria-labelledby="co-slots-label"
              aria-invalid={Boolean(errors["fulfillment.timeSlotId"])}
              className="grid gap-2 sm:grid-cols-3"
            >
              {timeSlots.map((slot) => (
                <Label
                  key={slot.id}
                  htmlFor={`co-${slot.id}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 font-normal has-data-[state=checked]:border-ink has-data-[state=checked]:bg-muted",
                    !slot.available && "cursor-not-allowed opacity-50",
                  )}
                >
                  <RadioGroupItem id={`co-${slot.id}`} value={slot.id} disabled={!slot.available} />
                  <span className="tabular text-sm">
                    {slot.label}
                    {!slot.available && <span className="block text-xs text-muted-foreground">Sin cupo</span>}
                  </span>
                </Label>
              ))}
            </RadioGroup>
            {timeSlots.length > 0 && !timeSlots.some((slot) => slot.available) && (
              <p className="text-sm text-muted-foreground">No quedan franjas para esta fecha. Elige otro día.</p>
            )}
            {errors["fulfillment.timeSlotId"] && (
              <p className="text-xs font-medium text-destructive">{errors["fulfillment.timeSlotId"]}</p>
            )}
          </div>
        </Fieldset>

        <Fieldset title="Pago">
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Al continuar, pagas en la pasarela de pagos con tarjeta, PSE, Nequi u otros medios. EcoMovilidad no recibe ni almacena
            los datos de tu tarjeta. Si no completas el pago a tiempo, el pedido se cancela y las unidades se liberan.
          </p>
          <PaymentModeNotice config={paymentConfig} />
        </Fieldset>

        <ConsentCheckbox id="co-consent" error={errors.dataConsent} />
      </div>

      <div className="lg:sticky lg:top-24">
        <OrderSummary itemCount={itemCount} subtotal={subtotal} total={total}>
          <ul className="space-y-2 border-t border-border pt-4 text-sm">
            {cart.items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-3">
                <span className="truncate">
                  {item.quantity} × {item.name}
                </span>
                <span className="tabular shrink-0">{formatCOP(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <Button type="submit" size="xl" variant="brand" className="w-full" disabled={form.isPending || reservationBlocked}>
            {form.isPending ? "Creando pedido…" : "Continuar al pago"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Puedes ejercer el derecho de retracto según la Ley 1480 de 2011.{" "}
            <Link href="/terminos" className="underline underline-offset-4">
              Términos y condiciones
            </Link>
          </p>
        </OrderSummary>
      </div>
    </form>
  );
}
