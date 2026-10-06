"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useTransition, type ReactNode } from "react";
import type { ProductFilters } from "@/types";
import { catalogFiltersToSearchParams } from "../lib/search-params";

interface CatalogNavigationValue {
  filters: ProductFilters;
  isPending: boolean;
  /** Aplica cambios parciales a los filtros y actualiza la URL. */
  update(patch: Partial<ProductFilters>): void;
  reset(): void;
}

const CatalogNavigationContext = createContext<CatalogNavigationValue | null>(null);

/**
 * Los filtros viven en la URL (compartibles e indexables). Este contexto
 * coordina las transiciones para que la lista muestre su estado pendiente.
 */
export function CatalogNavigationProvider({ filters, children }: { filters: ProductFilters; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function navigate(next: ProductFilters) {
    const query = catalogFiltersToSearchParams(next).toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  const value: CatalogNavigationValue = {
    filters,
    isPending,
    update(patch) {
      const next = { ...filters, ...patch };
      // Las especificaciones dependen de la categoría: al cambiarla se limpian.
      if ("category" in patch && patch.category !== filters.category) next.specs = undefined;
      navigate(next);
    },
    reset() {
      navigate({ query: filters.query, sort: filters.sort });
    },
  };

  return <CatalogNavigationContext.Provider value={value}>{children}</CatalogNavigationContext.Provider>;
}

export function useCatalogNavigation(): CatalogNavigationValue {
  const context = useContext(CatalogNavigationContext);
  if (!context) throw new Error("useCatalogNavigation debe usarse dentro de <CatalogNavigationProvider>.");
  return context;
}

/** Atenúa los resultados mientras llega la nueva página. */
export function CatalogResultsRegion({ children }: { children: ReactNode }) {
  const { isPending } = useCatalogNavigation();
  return (
    <div
      aria-busy={isPending}
      className="transition-opacity duration-200 data-[pending=true]:opacity-50"
      data-pending={isPending}
    >
      {children}
    </div>
  );
}
