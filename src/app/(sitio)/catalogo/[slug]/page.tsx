import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/shared/container";
import { JsonLd } from "@/components/shared/json-ld";
import { Price } from "@/components/shared/price";
import { StockBadge } from "@/components/shared/stock-badge";
import { BranchAvailability } from "@/features/catalog/components/branch-availability";
import { PhotoCredit } from "@/features/catalog/components/photo-credit";
import { ProductGallery } from "@/features/catalog/components/product-gallery";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { ProductSpecs } from "@/features/catalog/components/product-specs";
import { PurchasePanel } from "@/features/catalog/components/purchase-panel";
import { DroneRegulatoryNotice } from "@/features/catalog/components/regulatory-notice";
import { categoryLabels } from "@/features/catalog/lib/labels";
import { api } from "@/lib/api";
import { absoluteUrl, createPageMetadata } from "@/lib/seo";
import type { Product } from "@/types";

export async function generateStaticParams() {
  const { items } = await api.catalog.listProducts();
  return items.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps<"/catalogo/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await api.catalog.getProductBySlug(slug);
  if (!product) return { title: "Producto no encontrado", robots: { index: false } };

  return createPageMetadata({
    title: product.name,
    description: product.shortDescription,
    path: `/catalogo/${product.slug}`,
  });
}

const availabilityUrl: Record<Product["stock"]["status"], string> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
};

function productJsonLd(product: Product) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      sku: product.sku,
      description: product.description,
      brand: { "@type": "Brand", name: product.brand },
      category: categoryLabels[product.category],
      image: product.images.map((image) => absoluteUrl(image.src)),
      offers: {
        "@type": "Offer",
        url: absoluteUrl(`/catalogo/${product.slug}`),
        priceCurrency: "COP",
        price: product.price,
        availability: availabilityUrl[product.stock.status],
        itemCondition: "https://schema.org/NewCondition",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Catálogo", item: absoluteUrl("/catalogo") },
        {
          "@type": "ListItem",
          position: 2,
          name: categoryLabels[product.category],
          item: absoluteUrl(`/catalogo?categoria=${product.category}`),
        },
        { "@type": "ListItem", position: 3, name: product.name },
      ],
    },
  ];
}

export default async function ProductPage({ params }: PageProps<"/catalogo/[slug]">) {
  const { slug } = await params;
  // Peticiones en paralelo para evitar cascadas.
  const [product, branches] = await Promise.all([api.catalog.getProductBySlug(slug), api.branches.listBranches()]);
  if (!product) notFound();

  const { items: sameCategory } = await api.catalog.listProducts({ category: product.category });
  const related = sameCategory.filter((item) => item.id !== product.id).slice(0, 3);

  return (
    <>
      <JsonLd data={productJsonLd(product)} />
      <Container className="py-8 sm:py-10">
        <nav aria-label="Ruta de navegación" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li className="flex items-center gap-1.5">
              <Link href="/catalogo" className="hover:text-foreground">
                Catálogo
              </Link>
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </li>
            <li className="flex items-center gap-1.5">
              <Link href={`/catalogo?categoria=${product.category}`} className="hover:text-foreground">
                {categoryLabels[product.category]}
              </Link>
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </li>
            <li aria-current="page" className="text-foreground">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <div className="min-w-0">
            <ProductGallery images={product.images} />
            <PhotoCredit src={product.images[0]?.src} />
          </div>

          <div className="space-y-7">
            <div className="space-y-3">
              <p className="flex flex-wrap gap-x-4 text-muted-foreground">
                <span>{product.brand}</span>
                <span>Ref. {product.sku}</span>
              </p>
              <h1 className="font-display text-4xl sm:text-5xl">{product.name}</h1>
              <p className="text-lg text-muted-foreground">{product.shortDescription}</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Price amount={product.price} compareAt={product.compareAtPrice} size="lg" />
              <StockBadge status={product.stock.status} />
            </div>
            <ul className="flex flex-wrap gap-2">
              {product.highlights.map((highlight) => (
                <li key={highlight} className="rounded-full border border-border px-3 py-1 text-sm">
                  {highlight}
                </li>
              ))}
            </ul>
            <PurchasePanel product={product} />
            {product.category === "drones" && <DroneRegulatoryNotice />}
          </div>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-2">
          <section aria-labelledby="descripcion" className="space-y-4">
            <h2 id="descripcion" className="font-display-tight text-2xl">
              Descripción
            </h2>
            <p className="max-w-prose leading-relaxed text-muted-foreground">{product.description}</p>
            <h2 id="disponibilidad" className="font-display-tight pt-6 text-2xl">
              Disponibilidad por sucursal
            </h2>
            <BranchAvailability stock={product.stock.byBranch} branches={branches} />
          </section>
          <section aria-labelledby="especificaciones" className="space-y-4">
            <h2 id="especificaciones" className="font-display-tight text-2xl">
              Especificaciones
            </h2>
            <ProductSpecs specs={product.specs} />
          </section>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="relacionados" className="mt-20">
            <h2 id="relacionados" className="font-display-tight text-2xl sm:text-3xl">
              Más {categoryLabels[product.category].toLowerCase()}
            </h2>
            <ProductGrid products={related} className="mt-6" />
          </section>
        )}
      </Container>
    </>
  );
}
