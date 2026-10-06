import Link from "next/link";
import { Gauge, ShieldCheck, Wrench } from "lucide-react";
import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { RouteSteps } from "@/components/shared/route-steps";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { RentalVehicleCard } from "@/features/rentals/components/rental-vehicle-card";
import { TimeSlotList } from "@/features/rentals/components/time-slot-list";
import { MAINTENANCE_LOCK_THRESHOLD } from "@/features/rentals/lib/maintenance";
import { api } from "@/lib/api";
import { createPageMetadata } from "@/lib/seo";

/** Disponibilidad y franjas del día: regeneración periódica. */
export const revalidate = 300;

export const metadata = createPageMetadata({
  title: "Alquiler de bicicletas, patinetas, patines y drones",
  description: "Alquila por horas, días o semanas. Recoge en sucursal o recibe en casa en la franja que elijas. Flota con mantenimiento preventivo.",
  path: "/alquiler",
});

const steps = [
  { title: "Elige vehículo y duración", description: "Por horas, días o semanas, según el vehículo." },
  { title: "Define entrega o recogida", description: "En una sucursal o en tu dirección, en una franja de dos horas." },
  { title: "Paga en línea", description: "Con PSE, tarjeta o billetera digital." },
  { title: "Recibe y confirma", description: "Validamos la entrega con un código QR único o con tu firma digital." },
  { title: "Devuelve", description: "En cualquier sucursal con alquiler o programando la recogida." },
];

const maintenancePoints = [
  {
    icon: Gauge,
    title: "Control por uso",
    description: "Medimos kilómetros recorridos en vehículos terrestres y horas de vuelo en drones.",
  },
  {
    icon: ShieldCheck,
    title: "Retiro preventivo",
    description: `Al llegar al ${Math.round(MAINTENANCE_LOCK_THRESHOLD * 100)}% de su límite de uso, el equipo sale del catálogo hasta pasar revisión.`,
  },
  {
    icon: Wrench,
    title: "Historial por equipo",
    description: "Cada revisión registra piezas cambiadas, técnico responsable y fecha de salida del taller.",
  },
];

export default async function RentalsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [vehicles, branches, slots] = await Promise.all([
    api.rentals.listRentalVehicles(),
    api.branches.listBranches(),
    api.rentals.listTimeSlots(today),
  ]);

  return (
    <>
      <PageHeader
        title="Alquiler"
        description="Vehículos revisados y listos para salir, con casco y accesorios. Recoge en sucursal o recíbelos donde estés."
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
            description="Tarifas con IVA incluido. La disponibilidad se actualiza según la flota de cada sucursal."
          />
          <div className="space-y-6">
            {vehicles.map((vehicle) => (
              <RentalVehicleCard key={vehicle.id} vehicle={vehicle} branches={branches} />
            ))}
          </div>
        </section>

        <section aria-labelledby="proceso-title" className="space-y-10">
          <SectionHeading id="proceso-title" title="Cómo funciona el alquiler" />
          <RouteSteps steps={steps} />
        </section>

        <section aria-labelledby="franjas-title" className="space-y-8">
          <SectionHeading
            id="franjas-title"
            title="Entrega y recogida a domicilio"
            description="Eliges una franja de dos horas según la capacidad logística del día. Estas son las franjas de hoy."
          />
          <TimeSlotList slots={slots} />
        </section>

        <section aria-labelledby="mantenimiento-title" className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading
            id="mantenimiento-title"
            title="Mantenimiento antes que reemplazo"
            description="Si un equipo falla durante tu alquiler, lo reemplazamos. Pero preferimos que no pase."
          />
          <ul className="grid gap-6 sm:grid-cols-3">
            {maintenancePoints.map(({ icon: Icon, title, description }) => (
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
