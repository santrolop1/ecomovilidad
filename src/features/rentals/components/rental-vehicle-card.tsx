import Image from "next/image";
import Link from "next/link";
import { Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCOP } from "@/lib/format";
import type { Branch, RentalVehicle } from "@/types";
import { durationLabels } from "../lib/labels";
import { totalAvailable } from "../lib/maintenance";

interface RentalVehicleCardProps {
  vehicle: RentalVehicle;
  branches: Branch[];
}

export function RentalVehicleCard({ vehicle, branches }: RentalVehicleCardProps) {
  const available = totalAvailable(vehicle);
  const branchNames = vehicle.availability
    .filter((entry) => entry.available > 0)
    .map((entry) => branches.find((b) => b.id === entry.branchId))
    .filter((branch): branch is Branch => branch !== undefined)
    .map((branch) => `${branch.city} (${branch.name})`);
  const headingId = `${vehicle.slug}-title`;

  return (
    <article
      id={vehicle.slug}
      aria-labelledby={headingId}
      className="grid scroll-mt-24 overflow-hidden rounded-3xl border border-border bg-card md:grid-cols-[minmax(0,0.9fr)_1.1fr]"
    >
      <div className="relative aspect-[4/3] md:aspect-auto">
        <Image src={vehicle.image.src} alt={vehicle.image.alt} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
      </div>
      <div className="flex flex-col gap-5 p-6 sm:p-8">
        <div>
          <h3 id={headingId} className="font-display-tight text-2xl">
            {vehicle.name}
          </h3>
          <p className="mt-2 text-muted-foreground">{vehicle.description}</p>
        </div>

        <dl className="grid grid-cols-3 gap-2">
          {vehicle.rates.map((rate) => (
            <div key={rate.unit} className="rounded-xl bg-muted px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">Por {durationLabels[rate.unit].per}</dt>
              <dd className="tabular mt-0.5 font-semibold">{formatCOP(rate.price)}</dd>
            </div>
          ))}
        </dl>

        <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
          {vehicle.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-volt-strong" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>

        {vehicle.requirements && (
          <div className="flex gap-2 rounded-xl border border-border p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <ul className="space-y-1">
              {vehicle.requirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <span className="tabular font-semibold">{available} disponibles</span>
            <span className="block text-muted-foreground">{branchNames.join(", ")}</span>
          </p>
          <Button asChild size="xl" variant="brand" className="shrink-0">
            <Link href={`/contacto?asunto=alquiler&vehiculo=${vehicle.slug}`}>Solicitar alquiler</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
