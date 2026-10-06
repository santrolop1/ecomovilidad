import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { siteConfig } from "@/config/site";
import { ContactForm } from "@/features/contact/components/contact-form";
import { contactTopics } from "@/features/contact/lib/schema";
import { api } from "@/lib/api";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Contacto",
  description: "Escríbenos sobre compras, alquileres, domicilios o mantenimiento. Te respondemos por correo.",
  path: "/contacto",
});

type Topic = (typeof contactTopics)[number]["value"];

function isTopic(value: unknown): value is Topic {
  return contactTopics.some((topic) => topic.value === value);
}

export default async function ContactPage({ searchParams }: PageProps<"/contacto">) {
  const params = await searchParams;
  const topic = isTopic(params.asunto) ? params.asunto : undefined;
  let defaultMessage: string | undefined;

  if (topic === "alquiler" && typeof params.vehiculo === "string") {
    const vehicles = await api.rentals.listRentalVehicles();
    const vehicle = vehicles.find((v) => v.slug === params.vehiculo);
    if (vehicle) defaultMessage = `Quiero alquilar: ${vehicle.name}. Fecha y duración: `;
  }

  return (
    <>
      <PageHeader title="Contacto" description="Cuéntanos qué necesitas y te respondemos por correo." />
      <Container className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[1fr_1.6fr]">
        <aside className="space-y-8">
          <div>
            <h2 className="font-display-tight text-xl">Otros canales</h2>
            <ul className="mt-4 space-y-3">
              <li>
                <a href={`mailto:${siteConfig.contact.email}`} className="inline-flex items-center gap-3 hover:underline">
                  <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
                  {siteConfig.contact.email}
                </a>
              </li>
              <li>
                <a href={siteConfig.contact.phoneHref} className="inline-flex items-center gap-3 hover:underline">
                  <Phone className="size-4 text-muted-foreground" aria-hidden="true" />
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li>
                <Link href="/sucursales" className="inline-flex items-center gap-3 hover:underline">
                  <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
                  Visítanos en una sucursal
                </Link>
              </li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            Antes de escribir, revisa el{" "}
            <Link href="/ayuda" className="font-medium text-foreground underline underline-offset-4">
              centro de ayuda
            </Link>
            : quizá tu pregunta ya tiene respuesta.
          </p>
        </aside>
        <ContactForm defaultTopic={topic} defaultMessage={defaultMessage} />
      </Container>
    </>
  );
}
