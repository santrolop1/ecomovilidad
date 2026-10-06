import Link from "next/link";
import { Check } from "lucide-react";
import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { RouteSteps } from "@/components/shared/route-steps";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { ServiceIconView } from "@/features/content/components/service-icon";
import { api } from "@/lib/api";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Servicios: venta, alquiler, domicilios y mantenimiento",
  description:
    "Venta de vehículos nuevos, alquiler, domicilios con seguimiento en tiempo real, mantenimiento preventivo y puntos de servicio en Colombia.",
  path: "/servicios",
});

/** Estados obligatorios de un domicilio (RF 5.3). */
const deliveryStates = [
  { title: "Creado", description: "Registramos tu pedido y la franja horaria elegida." },
  { title: "Asignado", description: "Asignamos el domiciliario más cercano al punto de recogida." },
  { title: "En recogida", description: "El domiciliario retira el vehículo en la sucursal." },
  { title: "En tránsito", description: "Sigues el recorrido en el mapa con el enlace que te enviamos." },
  { title: "Entregado", description: "Confirmas con el código QR de la orden o con tu firma digital." },
];

export default async function ServicesPage() {
  const services = await api.content.listServices();

  return (
    <>
      <PageHeader
        title="Servicios"
        description="Todo lo que necesitas para moverte en eléctrico: comprar, alquilar, recibir en casa y mantener tu vehículo."
      />
      <Container className="space-y-24 py-14 sm:py-20">
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li key={service.id} id={service.slug} className="flex scroll-mt-24 flex-col rounded-2xl border border-border bg-card p-6">
              <ServiceIconView icon={service.icon} className="size-6 text-volt-strong" />
              <h2 className="font-display-tight mt-5 text-xl">{service.title}</h2>
              <p className="mt-2 text-muted-foreground">{service.summary}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {service.details.map((detail) => (
                  <li key={detail} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-volt-strong" aria-hidden="true" />
                    {detail}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" size="lg" className="mt-6 self-start rounded-full">
                <Link href={service.href}>Ver más</Link>
              </Button>
            </li>
          ))}
        </ul>

        <section id="domicilios" aria-labelledby="domicilios-title" className="scroll-mt-24 space-y-10">
          <SectionHeading
            id="domicilios-title"
            title="Así avanza tu domicilio"
            description="Te avisamos en cada cambio de estado. Si una entrega no se puede completar, el pedido queda como fallido y te contactamos para reprogramarla."
          />
          <RouteSteps steps={deliveryStates} />
        </section>

        <section
          id="mantenimiento"
          aria-labelledby="mantenimiento-title"
          className="surface-ink grid scroll-mt-24 gap-8 rounded-3xl p-8 sm:p-12 lg:grid-cols-[1.2fr_1fr] lg:items-center"
        >
          <div>
            <h2 id="mantenimiento-title" className="font-display-tight text-3xl sm:text-4xl">
              Mantenimiento preventivo
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Programamos revisiones según los kilómetros recorridos o las horas de vuelo. Puedes agendar la recogida de tu
              vehículo en una franja horaria y lo devolvemos revisado, con el registro de piezas y técnico responsable.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button asChild size="xl" variant="brand">
              <Link href="/contacto?asunto=mantenimiento">Agendar mantenimiento</Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="/sucursales">Sucursales con taller</Link>
            </Button>
          </div>
        </section>
      </Container>
    </>
  );
}
