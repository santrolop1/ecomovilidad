import Link from "next/link";
import { ArrowDown, ArrowUpRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { ServiceMap } from "@/features/branches/components/service-map";
import { availableUnits } from "@/features/branches/lib/geo";
import type { Branch, HeroContent } from "@/types";

interface HeroProps {
  content: HeroContent;
  branches: Branch[];
}

export function Hero({ content, branches }: HeroProps) {
  // Sucursal con más unidades: dato real para la tarjeta de disponibilidad.
  const spotlight = [...branches].sort((a, b) => availableUnits(b) - availableUnits(a))[0];
  const spotlightTotal = spotlight ? availableUnits(spotlight) : 0;

  return (
    <section aria-labelledby="hero-title" className="surface-ink relative overflow-hidden">
      <Container className="grid items-center gap-8 pt-14 pb-16 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:gap-6 lg:pt-16 lg:pb-20">
        <div className="relative z-10">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-medium text-volt">
            <MapPin className="size-3.5" aria-hidden="true" />
            Bucaramanga y su área metropolitana
          </p>
          <h1 id="hero-title" className="font-display max-w-3xl text-[clamp(2.75rem,7.2vw,5.6rem)] text-balance">
            {content.title}
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground sm:text-xl">{content.subtitle}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="xl" variant="brand">
              <Link href={content.primaryCta.href}>{content.primaryCta.label}<ArrowUpRight aria-hidden="true" /></Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href={content.secondaryCta.href}>{content.secondaryCta.label}</Link>
            </Button>
          </div>
          <div className="mt-10 border-t border-border pt-5">
            <p className="text-xs font-medium text-muted-foreground">Encuentra tu próxima forma de moverte</p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Explorar por categoría">
              {[
                ["Bicicletas", "bicicletas"],
                ["Patinetas", "patinetas"],
                ["Patines", "patines"],
                ["Drones", "drones"],
              ].map(([label, slug]) => (
                <li key={slug}>
                  <Link href={`/catalogo?categoria=${slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm transition-colors hover:border-volt hover:text-volt">
                    {label}<ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mapa real (OpenStreetMap): el mismo componente y los mismos datos que /sucursales. */}
        <div className="mx-auto w-full max-w-[520px] min-w-0 space-y-3 lg:max-w-none">
          <div className="flex items-center justify-between gap-4 px-1 pb-1">
            <p className="text-sm font-medium">Tu punto de partida está cerca</p>
            <Link href="/sucursales" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs text-volt hover:underline">Ver puntos<ArrowUpRight className="size-3.5" aria-hidden="true" /></Link>
          </div>
          <ServiceMap branches={branches} className="aspect-square sm:aspect-[4/3] lg:aspect-[5/4]" />
          {spotlight && (
            <Link
              href={`/sucursales#${spotlight.slug}`}
              className="block rounded-2xl border border-border bg-ink-2 p-4 transition-colors hover:border-volt/50"
            >
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-volt" aria-hidden="true" />
                {spotlight.isDemo ? "Disponibilidad de demostración" : spotlightTotal > 0 ? "Disponible ahora" : "Consulta disponibilidad"}
              </span>
              <span className="mt-1.5 block font-medium">
                {spotlight.city}, {spotlight.name}
              </span>
              <span className="tabular mt-0.5 block text-sm text-muted-foreground">
                {spotlightTotal} vehículos disponibles{spotlight.isDemo ? " en los datos de ejemplo" : " para comprar o alquilar"}
              </span>
            </Link>
          )}
        </div>
      </Container>
      <Container className="flex items-center justify-between gap-4 border-t border-border py-4 text-xs text-muted-foreground">
        <p>Compra a tu ritmo. Alquila para tu próximo recorrido.</p>
        <a href="#categorias-title" className="inline-flex min-h-11 shrink-0 items-center gap-2 hover:text-volt">Descubre más<ArrowDown className="size-3.5" aria-hidden="true" /></a>
      </Container>
    </section>
  );
}
