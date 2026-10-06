import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Container } from "@/components/shared/container";
import { CatalogEmptyState } from "@/features/catalog/components/catalog-empty-state";
import { CatalogFilters } from "@/features/catalog/components/catalog-filters";
import { CatalogNavigationProvider, CatalogResultsRegion } from "@/features/catalog/components/catalog-navigation";
import { CatalogToolbar } from "@/features/catalog/components/catalog-toolbar";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { categoryLabels } from "@/features/catalog/lib/labels";
import { parseCatalogSearchParams } from "@/features/catalog/lib/search-params";
import { api } from "@/lib/api";
import { createPageMetadata } from "@/lib/seo";

const categoryTitles = {
  bicicletas: "Bicicletas eléctricas y urbanas",
  patinetas: "Patinetas eléctricas",
  patines: "Patines de línea",
  drones: "Drones con cámara",
} as const;

const categoryDescriptions = {
  bicicletas: "Bicicletas eléctricas urbanas, plegables y de montaña, además de modelos mecánicos.",
  patinetas: "Patinetas eléctricas urbanas y todo terreno con autonomía de 25 a 65 km.",
  patines: "Patines de línea urbanos, de fitness, de velocidad y ajustables para niños.",
  drones: "Drones con cámara 4K y 6K, retorno automático y geocercas configurables.",
} as const;

export async function generateMetadata({ searchParams }: PageProps<"/catalogo">): Promise<Metadata> {
  const { category } = parseCatalogSearchParams(await searchParams);
  if (category) {
    return createPageMetadata({
      title: categoryTitles[category],
      description: categoryDescriptions[category],
      path: `/catalogo?categoria=${category}`,
    });
  }
  return createPageMetadata({
    title: "Catálogo de vehículos",
    description: "Compra bicicletas, patinetas eléctricas, patines y drones. Filtra por categoría, precio, marca y especificaciones.",
    path: "/catalogo",
  });
}

export default async function CatalogPage({ searchParams }: PageProps<"/catalogo">) {
  const filters = parseCatalogSearchParams(await searchParams);
  const { items, total, facets } = await api.catalog.listProducts(filters);
  const heading = filters.category ? categoryLabels[filters.category] : "Catálogo";

  return (
    <CatalogNavigationProvider filters={filters}>
      <PageHeader
        title={heading}
        description={filters.category ? categoryDescriptions[filters.category] : "Vehículos nuevos con garantía, factura electrónica y entrega a domicilio o en sucursal."}
      />
      <Container className="grid gap-10 py-10 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Filtros" className="hidden lg:block">
          <div className="sticky top-24">
            <CatalogFilters facets={facets} />
          </div>
        </aside>
        <section aria-label="Resultados" className="min-w-0 space-y-6">
          <CatalogToolbar total={total} facets={facets} />
          <CatalogResultsRegion>
            {items.length > 0 ? <ProductGrid products={items} priorityCount={3} /> : <CatalogEmptyState />}
          </CatalogResultsRegion>
        </section>
      </Container>
    </CatalogNavigationProvider>
  );
}
