"use client";

import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useCatalogNavigation } from "./catalog-navigation";

export function CatalogEmptyState() {
  const { filters, update } = useCatalogNavigation();
  return (
    <EmptyState
      icon={SearchX}
      title="No hay productos con esos filtros"
      description={
        filters.query
          ? `No encontramos resultados para “${filters.query}”. Prueba con otra palabra o quita algunos filtros.`
          : "Quita algunos filtros o amplía el rango de precio para ver más opciones."
      }
      action={
        <Button size="xl" onClick={() => update({ query: undefined, category: undefined, brands: undefined, minPrice: undefined, maxPrice: undefined, specs: undefined })}>
          Ver todo el catálogo
        </Button>
      }
    />
  );
}
