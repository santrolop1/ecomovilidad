import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { RentalCard } from "@/features/account/components/rental-card";
import { api } from "@/lib/api";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Mis alquileres",
  description: "Estado, pago y factura de tus alquileres.",
  path: "/cuenta/alquileres",
  noIndex: true,
});

export default async function MyRentalsPage() {
  const rentals = await api.rentals.listRentals();
  return (
    <>
      <h1 className="font-display text-3xl sm:text-4xl">Mis alquileres</h1>
      {rentals.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Aún no tienes alquileres"
          description="Cuando reserves un vehículo aparecerá aquí con su estado y su factura."
          action={
            <Button asChild size="xl" variant="brand">
              <Link href="/alquiler">Ver alquileres</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {rentals.map((rental) => (
            <li key={rental.id}>
              <RentalCard rental={rental} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
