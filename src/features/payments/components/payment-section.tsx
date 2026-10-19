import type { ReactNode } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/format";
import type { InvoiceRef, PaymentSummary } from "@/types";
import { paymentMethodLabel, paymentStatusLabels } from "../lib/labels";
import { InvoiceLinks } from "./invoice-links";
import { PayButton } from "./pay-button";

interface PaymentSectionProps {
  /** Pendiente de pago: se ofrece pagar mientras no venza el plazo. */
  awaitingPayment: boolean;
  expiresAt?: string;
  payment?: PaymentSummary;
  invoice?: InvoiceRef;
  target: { orderId: string } | { rentalId: string };
  /** Texto cuando ya no se puede pagar (cancelado, vencido). */
  closedNote?: string;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  );
}

/** Estado del pago, factura y botón para pagar (Wompi o la pasarela de pruebas). */
export function PaymentSection({ awaitingPayment, expiresAt, payment, invoice, target, closedNote }: PaymentSectionProps) {
  const status = payment ? paymentStatusLabels[payment.status] : null;
  return (
    <section aria-labelledby="pago" className="rounded-2xl border border-border bg-card p-5">
      <h2 id="pago" className="font-display-tight text-lg">
        Pago
      </h2>
      <dl className="mt-3 grid gap-3 text-sm">
        {payment && status ? (
          <>
            <Row label="Último intento">
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </Row>
            <Row label="Medio">{paymentMethodLabel(payment.paymentMethodType)}</Row>
            <Row label="Referencia">
              <span className="tabular">{payment.reference}</span>
            </Row>
            {payment.approvedAt && <Row label="Fecha de aprobación">{formatDateTime(payment.approvedAt)}</Row>}
            {payment.status !== "approved" && payment.statusMessage && <Row label="Detalle">{payment.statusMessage}</Row>}
          </>
        ) : (
          <Row label="Estado">{awaitingPayment ? "Sin pagar" : (closedNote ?? "Sin pago registrado")}</Row>
        )}
        {invoice && (
          <Row label={`Factura ${invoice.number}`}>
            <InvoiceLinks invoice={invoice} />
          </Row>
        )}
      </dl>
      {awaitingPayment && (
        <div className="mt-4 space-y-2">
          {expiresAt && <p className="text-sm text-muted-foreground">Paga antes de las {formatDateTime(expiresAt)}; después se libera lo apartado.</p>}
          <PayButton target={target} label={payment ? "Intentar el pago de nuevo" : "Pagar ahora"} />
          <p className="text-xs text-muted-foreground">Pagas en la pasarela de pagos (tarjeta, PSE, Nequi u otros medios). No guardamos datos de tu tarjeta.</p>
        </div>
      )}
    </section>
  );
}
