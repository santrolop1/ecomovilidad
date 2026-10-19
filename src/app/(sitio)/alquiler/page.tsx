import Link from "next/link";
import { CalendarClock, ShieldCheck, Wrench } from "lucide-react";
import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RouteSteps } from "@/components/shared/route-steps";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { RentalOfferCard } from "@/features/rentals/components/rental-offer-card";
import { api } from "@/lib/api";
import { createPageMetadata } from "@/lib/seo";

/** Tarifas y flota: regeneración frecuente (la disponibilidad por fechas se cotiza al reservar). */
export const revalidate = 60;

export const metadata = createPageMetadata({
  title: "Alquiler de bicicletas, patinetas, patines y drones",
  description: "Alquila por horas o días. Reserva, paga en línea y recoge en una sucursal del área metropolitana de Bucaramanga.",
  path: "/alquiler",
});

const steps = [
  { title: "Elige vehículo y sucursal", description: "Según la flota de cada sucursal." },
  { title: "Define recogida y devolución", description: "Dentro del horario de la sucursal; te mostramos el precio y si hay unidades libres." },
  { title: "Paga en línea", description: "Con tarjeta, PSE, Nequi u otros medios. Recibes la factura." },
  { title: "Recoge", description: "En la sucursal, a la hora reservada. Te entregamos una unidad concreta de la flota." },
  { title: "Devuelve", description: "En la misma sucursal, a la hora acordada." },
];

const fleetPoints = [
  {
    icon: CalendarClock,
    title: "Disponibilidad real",
    description: "Cada reserva aparta una unidad concreta: nunca se alquila dos veces la misma en el mismo horario.",
  },
  {
    icon: Wrench,
    title: "Fuera de servicio, fuera de la oferta",
    description: "Las unidades en mantenimiento no se pueden reservar hasta volver a estar operativas.",
  },
  {
    icon: ShieldCheck,
    title: "Precio claro",
    description: "Se cobra la opción más económica entre horas y días completos, con IVA incluido.",
  },
];

export default async function RentalsPage() {
  const offers = await api.rentals.listOffers();

  return (
    <>
      <PageHeader
        title="Alquiler"
        description="Vehículos de nuestra flota, listos para salir. Reserva en línea y recoge en una sucursal del área metropolitana."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="xl" variant="brand">
            <Link href="#vehiculos">Ver vehículos</Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <Link href="/sucursales">Puntos de recogida</Link>
          </Button>
        </div>
      </PageHeader>

      <Container className="space-y-20 py-14 sm:py-20">
        <section aria-labelledby="vehiculos-title" id="vehiculos" className="scroll-mt-24 space-y-8">
          <SectionHeading
            id="vehiculos-title"
            title="Vehículos disponibles"
            description="Tarifas con IVA incluido. Al reservar verás si hay unidades libres para tus fechas."
          />
          {offers.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No hay vehículos de alquiler por ahora" description="Vuelve pronto o escríbenos desde Contacto." />
          ) : (
            <div className="space-y-6">
              {offers.map((offer) => (
                <RentalOfferCard key={offer.productId} offer={offer} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="proceso-title" className="space-y-10">
          <SectionHeading id="proceso-title" title="Cómo funciona el alquiler" />
          <RouteSteps steps={steps} />
        </section>

        <section aria-labelledby="flota-title" className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading
            id="flota-title"
            title="Una flota que se cuida"
            description="Si una unidad falla, sale de la oferta hasta que el taller la libera."
          />
          <ul className="grid gap-6 sm:grid-cols-3">
            {fleetPoints.map(({ icon: Icon, title, description }) => (
              <li key={title} className="space-y-2">
                <Icon className="size-6 text-volt-strong" aria-hidden="true" />
                <h3 className="font-display-tight text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </>
  );
}
