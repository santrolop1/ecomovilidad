import Link from "next/link";
import { Container } from "@/components/shared/container";
import { RouteSteps } from "@/components/shared/route-steps";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { PromoBanner } from "@/features/content/components/promo-banner";
import { ValuePropIconView } from "@/features/content/components/value-prop-icon";
import { getActiveBanners } from "@/features/content/lib/banners";
import { CategoryShowcase } from "@/features/home/components/category-showcase";
import { FinalCta } from "@/features/home/components/final-cta";
import { Hero } from "@/features/home/components/hero";
import { RentalTeaser } from "@/features/home/components/rental-teaser";
import { ServicePoints } from "@/features/home/components/service-points";
import { api } from "@/lib/api";
import { createPageMetadata } from "@/lib/seo";

/** Contenido administrable (RF 1.1): se regenera sin desplegar código. */
export const revalidate = 300;

const pageMetadata = createPageMetadata({
  title: "EcoMovilidad: movilidad eléctrica en Bucaramanga",
  description:
    "Compra, alquila y recibe bicicletas, patinetas eléctricas, patines y drones. Domicilios y puntos de servicio en Bucaramanga y su área metropolitana.",
  path: "/",
});

// Título absoluto: la plantilla "%s | EcoMovilidad" duplicaría la marca en la home.
export const metadata = { ...pageMetadata, title: { absolute: "EcoMovilidad: movilidad eléctrica en Bucaramanga" } };

const purchaseSteps = [
  { title: "Elige tu vehículo", description: "Compara por categoría, precio, marca y especificaciones." },
  { title: "Paga en línea", description: "PSE, tarjeta o billetera digital. Recibes la factura electrónica en tu correo." },
  { title: "Sigue tu domicilio", description: "Te enviamos un enlace para ver el recorrido en el mapa, o recoges en sucursal." },
  { title: "Confirma la entrega", description: "Con el código QR de tu orden o tu firma digital." },
];

export default async function HomePage() {
  // Todas las lecturas en paralelo: sin cascadas.
  const [content, categories, featured, rentals, branches, catalog] = await Promise.all([
    api.content.getHomeContent(),
    api.catalog.listCategories(),
    api.catalog.listFeaturedProducts(4),
    api.rentals.listRentalVehicles(),
    api.branches.listBranches(),
    api.catalog.listProducts(),
  ]);
  const [banner] = getActiveBanners(content.banners, new Date());
  const counts = Object.fromEntries(catalog.facets.categories.map((c) => [c.value, c.count]));

  return (
    <>
      <Hero content={content.hero} branches={branches} />
      {banner && <PromoBanner banner={banner} />}

      <Container className="space-y-24 py-20 lg:space-y-32 lg:py-28">
        <section aria-labelledby="categorias-title" className="space-y-8">
          <SectionHeading id="categorias-title" title="¿Cómo te quieres mover?" description="Cuatro categorías, nuevas y con garantía." />
          <CategoryShowcase categories={categories} counts={counts} />
        </section>

        <section aria-labelledby="destacados-title" className="space-y-8">
          <SectionHeading
            id="destacados-title"
            title="Destacados del catálogo"
            action={
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <Link href="/catalogo">Ver todo el catálogo</Link>
              </Button>
            }
          />
          <ProductGrid products={featured} className="lg:grid-cols-4 xl:grid-cols-4" />
        </section>
      </Container>

      <RentalTeaser vehicles={rentals} />

      <Container className="space-y-24 py-20 lg:space-y-32 lg:py-28">
        <section aria-labelledby="como-title" className="space-y-10">
          <SectionHeading id="como-title" title="Cómo funciona una compra" />
          <RouteSteps steps={purchaseSteps} />
        </section>

        <section aria-labelledby="puntos-title">
          <ServicePoints branches={branches} />
        </section>

        <section aria-labelledby="beneficios-title" className="space-y-10">
          <SectionHeading id="beneficios-title" title="Por qué EcoMovilidad" />
          <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {content.valuePropositions.map((item) => (
              <li key={item.id} className="border-t-2 border-ink pt-5">
                <ValuePropIconView icon={item.icon} className="size-6" />
                <h3 className="font-display-tight mt-4 text-lg">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </Container>

      <FinalCta />
    </>
  );
}
