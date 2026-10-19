import type { ReactNode } from "react";
import { ProductImage } from "@/components/shared/product-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaymentSection } from "@/features/payments/components/payment-section";
import { formatCOP, formatDateTime, shortId } from "@/lib/format";
import type { CustomerRental } from "@/types";
import { customerRentalStatus } from "../lib/labels";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  );
}

export function RentalDetail({ rental }: { rental: CustomerRental }) {
  const status = customerRentalStatus[rental.status];
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display tabular text-3xl sm:text-4xl">Alquiler {shortId(rental.id)}</h1>
          {rental.createdAt && <p className="mt-1 text-muted-foreground">Reservado el {formatDateTime(rental.createdAt)}</p>}
        </div>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </header>
      <p className="rounded-2xl border border-border bg-card p-4 text-sm">{status.help}</p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="vehiculo" className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-4">
            <span className="relative aspect-square overflow-hidden rounded-xl bg-muted">
              <ProductImage image={rental.imageUrl ? { src: rental.imageUrl, alt: rental.productName } : undefined} sizes="80px" compact />
            </span>
            <div className="min-w-0">
              <h2 id="vehiculo" className="font-display-tight text-xl">
                {rental.productName}
              </h2>
              {rental.unitCode && <p className="tabular text-sm text-muted-foreground">Unidad {rental.unitCode}</p>}
            </div>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label="Recoge">{formatDateTime(rental.startAt)}</Field>
            <Field label="Devuelve">{formatDateTime(rental.endAt)}</Field>
            <Field label="Sucursal">
              {rental.branchName}
              {rental.branchAddress ? `, ${rental.branchAddress}` : ""}
              {rental.branchCity ? ` (${rental.branchCity})` : ""}
            </Field>
            <Field label="Total">
              <span className="tabular font-semibold">{formatCOP(rental.price)}</span>
            </Field>
          </dl>
        </section>
        <PaymentSection
          awaitingPayment={rental.status === "pending"}
          expiresAt={rental.paymentExpiresAt}
          payment={rental.payment}
          invoice={rental.invoice}
          target={{ rentalId: rental.id }}
        />
      </div>
    </div>
  );
}
