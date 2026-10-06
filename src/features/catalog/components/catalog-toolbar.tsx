"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import type { CatalogFacets, ProductSort } from "@/types";
import { countActiveFilters, SORT_OPTIONS } from "../lib/search-params";
import { CatalogFilters } from "./catalog-filters";
import { useCatalogNavigation } from "./catalog-navigation";

const SEARCH_DEBOUNCE_MS = 350;

export function CatalogToolbar({ total, facets }: { total: number; facets: CatalogFacets }) {
  const { filters, update, isPending } = useCatalogNavigation();
  const [query, setQuery] = useState(filters.query ?? "");
  const debouncedSearch = useDebouncedCallback((value: string) => update({ query: value.trim() || undefined }), SEARCH_DEBOUNCE_MS);
  const activeCount = countActiveFilters(filters);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <form
        role="search"
        className="relative w-full lg:max-w-md"
        onSubmit={(event) => {
          event.preventDefault();
          update({ query: query.trim() || undefined });
        }}
      >
        <Label htmlFor="catalog-search" className="sr-only">
          Buscar en el catálogo
        </Label>
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id="catalog-search"
          type="search"
          value={query}
          maxLength={80}
          placeholder="Buscar por nombre, marca o uso"
          autoComplete="off"
          className="h-11 rounded-full bg-card pr-11 pl-11"
          onChange={(event) => {
            setQuery(event.target.value);
            debouncedSearch(event.target.value);
          }}
        />
        {query && (
          <button
            type="button"
            aria-label="Borrar búsqueda"
            className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            onClick={() => {
              setQuery("");
              update({ query: undefined });
            }}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="tabular text-sm text-muted-foreground" aria-live="polite">
          {isPending ? "Actualizando…" : `${total} ${total === 1 ? "resultado" : "resultados"}`}
        </p>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="lg" className="rounded-full lg:hidden">
                <SlidersHorizontal data-icon="inline-start" aria-hidden="true" />
                Filtros{activeCount > 0 ? ` (${activeCount})` : ""}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto">
              <SheetHeader className="sr-only">
                <SheetTitle>Filtros del catálogo</SheetTitle>
                <SheetDescription>Filtra por categoría, precio, marca y especificaciones.</SheetDescription>
              </SheetHeader>
              <div className="p-5">
                <CatalogFilters facets={facets} idPrefix="m" />
              </div>
            </SheetContent>
          </Sheet>

          <Label htmlFor="catalog-sort" className="sr-only">
            Ordenar por
          </Label>
          <Select value={filters.sort ?? "relevancia"} onValueChange={(value) => update({ sort: value as ProductSort })}>
            <SelectTrigger id="catalog-sort" className="h-10 min-w-40 rounded-full bg-card sm:min-w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
