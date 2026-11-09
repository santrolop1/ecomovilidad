import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/shared/container";
import { StatusBadge } from "@/components/shared/status-badge";
import { getSessionUser } from "@/features/auth/actions";
import { paymentStatusLabels } from "@/features/payments/lib/labels";
import { api, isRealApi } from "@/lib/api";
import { formatCOP, formatDateTime } from "@/lib/format";
import { createPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Cómo pagar",
  description: "Instrucciones para completar tu pago.",
  path: "/pagos/manual",
  noIndex: true,
});

/** Pago sin pasarela: el cliente ve cómo pagar y EcoMovilidad lo confirma en el panel. */
export default async function ManualPaymentPage({ searchParams }: PageProps<"/pagos/manual">) {
  const { referencia } = await searchParams;
  const reference = typeof referencia === "string" && /^[A-Za-z0-9-]{3,64}$/.test(referencia) ? referencia : null;
  if (!isRealApi || !reference) notFound();
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/pagos/manual?referencia=${reference}`)}`);

  const payment = await api.payments.getManualPayment(reference);
  if (!payment) notFound();
  const status = paymentStatusLabels[payment.status];
  const backHref = payment.target === "pedido" ? `/cuenta/pedidos/${payment.targetId}` : `/cuenta/alquileres/${payment.targetId}`;

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-lg space-y-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display-tight text-2xl">Cómo pagar</h1>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </div>
        <p className="whitespace-pre-line text-sm">{payment.instructions}</p>
        <dl className="grid gap-3 rounded-2xl bg-muted p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Escribe esta referencia al pagar</dt>
            <dd className="tabular break-all text-right font-semibold">{payment.reference}</dd>
          </div>
          {payment.expiresAt && payment.status === "pending" && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Pagar antes de</dt>
              <dd className="text-right">{formatDateTime(payment.expiresAt)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular">{formatCOP(payment.amount)}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">Cuando recibamos tu pago lo confirmaremos y verás el cambio en Mi cuenta.</p>
        <Link href={backHref} className="block text-sm underline">
          Ver mi {payment.target}
        </Link>
      </div>
    </Container>
  );
}
