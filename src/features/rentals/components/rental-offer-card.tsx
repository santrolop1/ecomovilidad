import Link from "next/link";
import { Info } from "lucide-react";
import { ProductImage } from "@/components/shared/product-image";
import { Button } from "@/components/ui/button";
import { formatCOP } from "@/lib/format";
import type { RentalOffer } from "@/types";
import { durationLabels } from "../lib/labels";
import { categoryRequirements, totalUnits } from "../lib/offers";

/** Vehículo de alquiler con tarifas y unidades reales por sucursal. */
export function RentalOfferCard({ offer }: { offer: RentalOffer }) {
  const headingId = `${offer.slug}-title`;
  const requirements = categoryRequirements[offer.category];
  return (
    <article
      id={offer.slug}
      aria-labelledby={headingId}
      className="grid scroll-mt-24 overflow-hidden rounded-3xl border border-border bg-card md:grid-cols-[minmax(0,0.9fr)_1.1fr]"
    >
      <div className="relative aspect-[4/3] bg-muted md:aspect-auto md:min-h-72">
        <ProductImage
          image={offer.imageUrl ? { src: offer.imageUrl, alt: offer.name } : undefined}
          sizes="(min-width: 768px) 40vw, 100vw"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-5 p-6 sm:p-8">
        <div>
          <h3 id={headingId} className="font-display-tight text-2xl">
            {offer.name}
          </h3>
          <p className="mt-2 text-muted-foreground">{offer.shortDescription}</p>
        </div>

        <dl className="grid grid-cols-2 gap-2 sm:max-w-sm">
          {offer.rates.map((rate) => (
            <div key={rate.unit} className="rounded-xl bg-muted px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">Por {durationLabels[rate.unit].per}</dt>
              <dd className="tabular mt-0.5 font-semibold">{formatCOP(rate.price)}</dd>
            </div>
          ))}
        </dl>

        {requirements && (
          <div className="flex gap-2 rounded-xl border border-border p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <ul className="space-y-1">
              {requirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-sm">
            <span className="tabular font-semibold">{totalUnits(offer)} unidades en la flota</span>
            <span className="block text-muted-foreground">
              {offer.branches.map((b) => `${b.branchCity} (${b.branchName})`).join(", ")}
            </span>
          </p>
          <Button asChild size="xl" variant="brand" className="shrink-0">
            <Link href={`/alquiler/${offer.slug}`}>Reservar</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
