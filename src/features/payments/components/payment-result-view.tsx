import { CircleAlert, CircleCheck, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PaymentResult } from "@/types";
import { paymentMethodLabel } from "../lib/labels";
import { InvoiceLinks } from "./invoice-links";
import { PayButton } from "./pay-button";
import { PendingRefresh } from "./pending-refresh";

/** Resultado de un pago tal como lo confirmó el backend con la pasarela. */
export function PaymentResultView({ result, canRetry }: { result: PaymentResult; canRetry: boolean }) {
  const isOrder = result.target === "pedido";
  const detailHref = isOrder ? `/cuenta/pedidos/${result.orderId}` : `/cuenta/alquileres/${result.rentalId}`;
  const target = isOrder ? { orderId: result.orderId! } : { rentalId: result.rentalId! };
  const what = isOrder ? "tu pedido" : "tu alquiler";

  if (result.status === "approved" && result.requiresRefund) {
    return (
      <Card icon={<CircleAlert className="size-12 text-warning" aria-hidden="true" />} title="Pago recibido fuera de plazo">
        <p>
          La pasarela aprobó el pago, pero el plazo de {what} ya había vencido y lo apartado se liberó. EcoMovilidad revisará el
          caso para devolverte el dinero. Referencia <span className="tabular">{result.reference}</span>.
        </p>
        <Actions href={detailHref} />
      </Card>
    );
  }
  if (result.status === "approved") {
    return (
      <Card icon={<CircleCheck className="size-12 text-volt-strong" aria-hidden="true" />} title="Pago aprobado">
        <p>
          Recibimos el pago de {what} con {paymentMethodLabel(result.paymentMethodType)}. Referencia{" "}
          <span className="tabular">{result.reference}</span>.
        </p>
        {result.invoice && (
          <div className="space-y-2">
            <p className="font-medium text-foreground">Factura {result.invoice.number}</p>
            <div className="flex justify-center">
              <InvoiceLinks invoice={result.invoice} />
            </div>
          </div>
        )}
        <Actions href={detailHref} primary />
      </Card>
    );
  }
  if (result.status === "pending") {
    return (
      <Card icon={<Clock className="size-12 text-warning" aria-hidden="true" />} title="Pago en proceso">
        <p>La pasarela aún está procesando el pago de {what}. No lo pagues de nuevo mientras tanto.</p>
        <PendingRefresh />
        <Actions href={detailHref} />
      </Card>
    );
  }
  return (
    <Card icon={<CircleAlert className="size-12 text-destructive" aria-hidden="true" />} title="El pago no se completó">
      <p>
        {result.statusMessage ?? "La pasarela no aprobó el pago."} No se te cobró. Puedes intentarlo de nuevo mientras {what} siga
        apartado.
      </p>
      {canRetry && (
        <div className="flex justify-center">
          <PayButton target={target} label="Intentar de nuevo" />
        </div>
      )}
      <Actions href={detailHref} />
    </Card>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div role="status" className="mx-auto max-w-xl space-y-4 rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
      <div className="flex justify-center">{icon}</div>
      <h1 className="font-display-tight text-2xl text-foreground">{title}</h1>
      {children}
    </div>
  );
}

function Actions({ href, primary = false }: { href: string; primary?: boolean }) {
  return (
    <div className="flex flex-wrap justify-center gap-3 pt-2">
      <Button asChild size="xl" variant={primary ? "brand" : "outline"}>
        <Link href={href}>Ver el detalle</Link>
      </Button>
      <Button asChild size="xl" variant="outline">
        <Link href="/catalogo">Volver al catálogo</Link>
      </Button>
    </div>
  );
}
