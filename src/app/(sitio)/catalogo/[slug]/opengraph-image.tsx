import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/components/seo/og-card";
import { categoryLabels } from "@/features/catalog/lib/labels";
import { api } from "@/lib/api";
import { formatCOP } from "@/lib/format";

export const alt = "Producto de EcoMovilidad";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await api.catalog.getProductBySlug(slug);

  return new ImageResponse(
    product ? (
      <OgCard
        eyebrow={`${categoryLabels[product.category]} de ${product.brand}`}
        title={product.name}
        footer={formatCOP(product.price)}
      />
    ) : (
      <OgCard eyebrow="Catálogo" title="EcoMovilidad" footer="Movilidad eléctrica en Bucaramanga" />
    ),
    size,
  );
}
