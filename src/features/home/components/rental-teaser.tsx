import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { durationLabels } from "@/features/rentals/lib/labels";
import { cheapestRate, totalUnits } from "@/features/rentals/lib/offers";
import { formatCOP } from "@/lib/format";
import type { RentalOffer } from "@/types";

export function RentalTeaser({ vehicles }: { vehicles: RentalOffer[] }) {
  return (
    <section aria-labelledby="alquiler-title" className="surface-ink">
      <Container className="grid gap-12 py-20 lg:grid-cols-[1fr_1.2fr] lg:py-28">
        <div>
          <h2 id="alquiler-title" className="font-display-tight text-3xl sm:text-[2.75rem]">
            Alquila por horas, días o semanas
          </h2>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Elige vehículo, sucursal y horario; reserva y paga en línea. Recógelo y devuélvelo en la misma sucursal.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="xl" variant="brand">
              <Link href="/alquiler">Ver alquileres</Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="/sucursales">Puntos de recogida</Link>
            </Button>
          </div>
        </div>

        <ul className="divide-y divide-border border-y border-border">
          {vehicles.map((vehicle) => {
            const cheapest = cheapestRate(vehicle);
            if (!cheapest) return null;
            return (
              <li key={vehicle.productId}>
                <Link
                  href={`/alquiler#${vehicle.slug}`}
                  className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-5 transition-colors hover:text-volt"
                >
                  <span className="font-display-tight text-lg">{vehicle.name}</span>
                  <span className="tabular text-right font-semibold">
                    {formatCOP(cheapest.price)}
                    <span className="font-normal text-muted-foreground"> / {durationLabels[cheapest.unit].per}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">{totalUnits(vehicle)} en la flota</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
