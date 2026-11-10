import Link from "next/link";
import { Compass } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="flex-1">
    <Container className="py-20">
      <EmptyState
        headingLevel="h1"
        icon={Compass}
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
      </main>
      <SiteFooter />
    </>
  );
}
