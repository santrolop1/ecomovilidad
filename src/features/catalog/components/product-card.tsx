import Link from "next/link";
import { Price } from "@/components/shared/price";
import { ProductImage } from "@/components/shared/product-image";
import { StockBadge } from "@/components/shared/stock-badge";
import type { Product } from "@/types";
import { categoryLabels } from "../lib/labels";

interface ProductCardProps {
  product: Product;
  /** Prioriza la carga de la imagen (primeras tarjetas visibles). */
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const [image] = product.images;
  const hasDiscount = product.compareAtPrice !== undefined && product.compareAtPrice > product.price;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,box-shadow] hover:border-ink/30 focus-within:border-ink/40">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <ProductImage
          image={image}
          sizes="(min-width: 1280px) 300px, (min-width: 640px) 45vw, 92vw"
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {hasDiscount && (
          <span className="absolute top-3 left-3 rounded-full bg-volt px-2.5 py-1 text-xs font-semibold text-ink">
            Precio especial
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-sm text-muted-foreground">
          {categoryLabels[product.category]} de {product.brand}
        </p>
        <h3 className="font-display-tight text-lg">
          <Link href={`/catalogo/${product.slug}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.shortDescription}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <Price amount={product.price} compareAt={product.compareAtPrice} />
          <StockBadge status={product.stock.status} />
        </div>
      </div>
    </article>
  );
}
