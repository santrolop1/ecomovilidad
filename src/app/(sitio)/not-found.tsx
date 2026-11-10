import Link from "next/link";
import { Compass } from "lucide-react";
import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

/** Dentro de la tienda: la cabecera y el pie ya vienen del layout. */
export default function SiteNotFound() {
  return (
    <Container className="py-20">
      <EmptyState
        icon={Compass}
        headingLevel="h1"
        title="Esta página no existe"
        description="Puede que el enlace esté desactualizado o que el producto ya no esté en el catálogo."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="xl">
              <Link href="/catalogo">Ver el catálogo</Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href="/">Ir al inicio</Link>
            </Button>
          </div>
        }
      />
    </Container>
  );
}
