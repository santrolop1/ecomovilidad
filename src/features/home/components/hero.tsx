import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { clusterByCity } from "@/features/branches/lib/geo";
import type { Branch, HeroContent } from "@/types";
import { HeroRoute } from "./hero-route";

interface HeroProps {
  content: HeroContent;
  branches: Branch[];
}

export function Hero({ content, branches }: HeroProps) {
  const cities = clusterByCity(branches);
  // Sucursal con más unidades: dato real para la tarjeta de disponibilidad.
  const spotlight = [...branches].sort(
    (a, b) => b.inventory.reduce((s, i) => s + i.available, 0) - a.inventory.reduce((s, i) => s + i.available, 0),
  )[0];
  const spotlightTotal = spotlight?.inventory.reduce((s, i) => s + i.available, 0) ?? 0;

  return (
    <section aria-labelledby="hero-title" className="surface-ink relative overflow-hidden">
      <Container className="grid items-center gap-8 pt-14 pb-16 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:gap-6 lg:pt-16 lg:pb-20">
        <div className="relative z-10">
          <h1 id="hero-title" className="font-display text-[clamp(2.75rem,7.2vw,5.6rem)]">
            {content.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">{content.subtitle}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="xl" variant="brand">
              <Link href={content.primaryCta.href}>{content.primaryCta.label}</Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href={content.secondaryCta.href}>{content.secondaryCta.label}</Link>
            </Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[420px] lg:max-w-none">
          <div className="aspect-[400/466] w-full">
            <HeroRoute cities={cities} />
          </div>
          {spotlight && (
            <Link
              href={`/sucursales#${spotlight.slug}`}
              className="absolute right-6 bottom-4 left-0 rounded-2xl border border-border bg-ink-2/90 p-4 backdrop-blur transition-colors hover:border-volt/50 sm:right-auto sm:w-72"
            >
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-volt" aria-hidden="true" />
                Disponible ahora
              </span>
              <span className="mt-1.5 block font-medium">
                {spotlight.city}, {spotlight.name}
              </span>
              <span className="tabular mt-0.5 block text-sm text-muted-foreground">
                {spotlightTotal} vehículos listos para comprar o alquilar
              </span>
            </Link>
          )}
        </div>
      </Container>
    </section>
  );
}
