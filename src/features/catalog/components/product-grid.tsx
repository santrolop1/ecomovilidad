import type { Product } from "@/types";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";

interface ProductGridProps {
  products: Product[];
  className?: string;
  /** Número de tarjetas iniciales con imagen prioritaria (LCP). */
  priorityCount?: number;
}

export function ProductGrid({ products, className, priorityCount = 0 }: ProductGridProps) {
  return (
    <ul className={cn("grid gap-5 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
