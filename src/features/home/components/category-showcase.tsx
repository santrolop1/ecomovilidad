import Image from "next/image";
import Link from "next/link";
import type { ProductCategory } from "@/types";

interface CategoryShowcaseProps {
  categories: ProductCategory[];
  counts: Partial<Record<ProductCategory["slug"], number>>;
}

export function CategoryShowcase({ categories, counts }: CategoryShowcaseProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {categories.map((category) => (
        <li key={category.slug}>
          <Link
            href={`/catalogo?categoria=${category.slug}`}
            className="group surface-ink block overflow-hidden rounded-2xl border border-border"
          >
            <div className="relative aspect-[4/3]">
              <Image
                src={category.image.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex items-end justify-between gap-2 p-4 sm:p-5">
              <div>
                <h3 className="font-display-tight text-lg sm:text-xl">{category.name}</h3>
                <p className="mt-1 hidden text-sm text-muted-foreground sm:block">{category.description}</p>
              </div>
              <span className="tabular shrink-0 text-sm text-muted-foreground">{counts[category.slug] ?? 0}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
