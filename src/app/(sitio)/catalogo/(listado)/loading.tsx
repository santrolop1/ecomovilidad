import { Container } from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/features/catalog/components/product-grid-skeleton";

export default function CatalogLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Cargando catálogo…</span>
      <div className="surface-ink">
        <Container className="space-y-4 pt-12 pb-10 sm:pt-16 sm:pb-14">
          <Skeleton className="h-12 w-64 bg-ink-3" />
          <Skeleton className="h-5 w-full max-w-lg bg-ink-3" />
        </Container>
      </div>
      <Container className="grid gap-10 py-10 lg:grid-cols-[260px_1fr]">
        <div className="hidden space-y-4 lg:block">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="space-y-6">
          <Skeleton className="h-11 w-full max-w-md rounded-full" />
          <ProductGridSkeleton />
        </div>
      </Container>
    </div>
  );
}
