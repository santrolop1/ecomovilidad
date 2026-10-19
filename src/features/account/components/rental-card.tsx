import Link from "next/link";
import { ProductImage } from "@/components/shared/product-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCOP, formatDateTime, shortId } from "@/lib/format";
import type { CustomerRental } from "@/types";
import { customerRentalStatus } from "../lib/labels";

/** Resumen de un alquiler para "Mis alquileres". */
export function RentalCard({ rental }: { rental: CustomerRental }) {
  const status = customerRentalStatus[rental.status];
  return (
    <article className="rounded-2xl border border-border bg-card transition-colors hover:border-ink/40">
      <Link href={`/cuenta/alquileres/${rental.id}`} className="grid grid-cols-[56px_minmax(0,1fr)] gap-4 p-4 sm:p-5">
        <span className="relative size-14 overflow-hidden rounded-xl bg-muted">
          <ProductImage image={rental.imageUrl ? { src: rental.imageUrl, alt: "" } : undefined} sizes="56px" compact />
        </span>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-display-tight text-lg">{rental.productName}</h2>
              <p className="tabular text-sm text-muted-foreground">Alquiler {shortId(rental.id)}</p>
            </div>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          </div>
          <p className="text-sm">
            {formatDateTime(rental.startAt)} a {formatDateTime(rental.endAt)}
          </p>
          <p className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span className="min-w-0 truncate">
              {rental.branchName}
              {rental.branchCity ? `, ${rental.branchCity}` : ""}
            </span>
            <span className="tabular shrink-0 font-semibold text-foreground">{formatCOP(rental.price)}</span>
          </p>
        </div>
      </Link>
    </article>
  );
}
