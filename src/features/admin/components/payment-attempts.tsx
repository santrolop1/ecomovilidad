import { StatusBadge } from "@/components/shared/status-badge";
import { InvoiceLinks } from "@/features/payments/components/invoice-links";
import { paymentMethodLabel, paymentStatusLabels } from "@/features/payments/lib/labels";
import type { AdminPayment } from "@/lib/api/admin-schemas";
import { formatDateTime } from "@/lib/format";
import { ManualPaymentActions } from "./manual-payment-actions";

interface PaymentAttemptsProps {
  payments: AdminPayment[];
  invoice?: { id: string; number: string; issuedAt: string } | null;
  expiresAt?: string | null;
}

/** Intentos de pago (Wompi o la pasarela de pruebas) de un pedido o alquiler, con la factura emitida. */
export function PaymentAttempts({ payments, invoice, expiresAt }: PaymentAttemptsProps) {
  return (
    <section aria-labelledby="pagos" className="rounded-2xl border border-border bg-card p-5">
      <h2 id="pagos" className="font-display-tight text-lg">
        Pagos
      </h2>
      {expiresAt && <p className="mt-1 text-sm text-muted-foreground">Plazo para pagar: {formatDateTime(expiresAt)}</p>}
      {payments.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Sin intentos de pago.</p>
      ) : (
        <ul className="mt-3 space-y-3 text-sm">
          {payments.map((payment) => {
            const status = paymentStatusLabels[payment.status];
            return (
              <li key={payment.reference} className="space-y-1 rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="tabular min-w-0 break-all font-medium">{payment.reference}</span>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </div>
                <p className="text-muted-foreground">
                  {payment.provider === "manual" && payment.status === "pending" ? "Pago manual por confirmar" : paymentMethodLabel(payment.paymentMethodType ?? undefined)} · {formatDateTime(payment.createdAt)}
                </p>
                {payment.providerTransactionId && (
                  <p className="tabular break-all text-xs text-muted-foreground">Transacción {payment.providerTransactionId}</p>
                )}
                {payment.statusMessage && <p className="text-xs text-muted-foreground">{payment.statusMessage}</p>}
                {payment.provider === "manual" && payment.status === "pending" && <ManualPaymentActions reference={payment.reference} />}
                {payment.requiresRefund && (
                  <p className="text-xs font-medium text-destructive">Aprobado fuera de plazo o duplicado: requiere reembolso.</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {invoice && (
        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <p className="font-medium">Factura {invoice.number}</p>
          <InvoiceLinks invoice={invoice} admin />
        </div>
      )}
    </section>
  );
}
