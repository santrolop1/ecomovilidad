import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="surface-ink">
      <Container className="flex flex-col items-start gap-8 py-20 lg:flex-row lg:items-end lg:justify-between lg:py-24">
        <div className="max-w-2xl">
          <h2 id="cta-title" className="font-display text-4xl sm:text-6xl">
            Tu próximo trayecto empieza aquí.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Compra con factura electrónica o alquila con entrega a domicilio. Si tienes dudas, te asesoramos.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="xl" variant="brand">
            <Link href="/catalogo">Explorar vehículos</Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <Link href="/contacto">Hablar con un asesor</Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
