"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatCOP } from "@/lib/format";
import type { CatalogFacets, ProductCategorySlug } from "@/types";
import { categoryLabels } from "../lib/labels";
import { countActiveFilters } from "../lib/search-params";
import { useCatalogNavigation } from "./catalog-navigation";

function toggle(values: string[] | undefined, value: string, checked: boolean): string[] | undefined {
  const next = checked ? [...(values ?? []), value] : (values ?? []).filter((v) => v !== value);
  return next.length ? next : undefined;
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function CheckboxOption({
  id,
  label,
  count,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  count: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <Label htmlFor={id} className="flex flex-1 cursor-pointer justify-between font-normal">
        <span>{label}</span>
        <span className="tabular text-muted-foreground">{count}</span>
      </Label>
    </div>
  );
}

function PriceFilter({ facets }: { facets: CatalogFacets }) {
  const { filters, update } = useCatalogNavigation();
  const [min, setMin] = useState(filters.minPrice?.toString() ?? "");
  const [max, setMax] = useState(filters.maxPrice?.toString() ?? "");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parse = (value: string) => {
      const number = Number(value.replace(/\D/g, ""));
      return value.trim() === "" || Number.isNaN(number) ? undefined : number;
    };
    let minPrice = parse(min);
    let maxPrice = parse(max);
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      [minPrice, maxPrice] = [maxPrice, minPrice];
    }
    update({ minPrice, maxPrice });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" aria-label="Filtrar por precio">
      <p className="text-sm text-muted-foreground">
        De {formatCOP(facets.priceRange.min)} a {formatCOP(facets.priceRange.max)}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="precio-min" className="text-xs text-muted-foreground">
            Mínimo (COP)
          </Label>
          <Input id="precio-min" inputMode="numeric" placeholder="0" value={min} onChange={(e) => setMin(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="precio-max" className="text-xs text-muted-foreground">
            Máximo (COP)
          </Label>
          <Input id="precio-max" inputMode="numeric" placeholder="Sin límite" value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
      </div>
      <Button type="submit" variant="outline" size="lg" className="w-full rounded-full">
        Aplicar precio
      </Button>
    </form>
  );
}

/** Filtros del catálogo (RF 6.1): categoría, precio, marca y especificaciones. */
export function CatalogFilters({ facets, idPrefix = "f" }: { facets: CatalogFacets; idPrefix?: string }) {
  const { filters, update, reset } = useCatalogNavigation();
  const activeCount = countActiveFilters(filters);

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <h2 className="font-display-tight text-lg">Filtros</h2>
        {activeCount > 0 && (
          <Button variant="link" size="sm" className="h-auto px-0 text-volt-strong" onClick={reset}>
            Limpiar ({activeCount})
          </Button>
        )}
      </div>

      <FilterGroup title="Categoría">
        <div className="flex flex-wrap gap-2">
          {(["bicicletas", "patinetas", "patines", "drones"] as ProductCategorySlug[]).map((slug) => {
            const selected = filters.category === slug;
            const count = facets.categories.find((c) => c.value === slug)?.count ?? 0;
            return (
              <button
                key={slug}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ category: selected ? undefined : slug })}
                className="rounded-full border border-border px-3.5 py-1.5 text-sm transition-colors hover:border-ink/40 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
              >
                {categoryLabels[slug]} <span className="tabular opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <Separator />

      <FilterGroup title="Precio">
        <PriceFilter
          key={`${filters.minPrice ?? ""}-${filters.maxPrice ?? ""}`}
          facets={facets}
        />
      </FilterGroup>

      {facets.brands.length > 0 && (
        <>
          <Separator />
          <FilterGroup title="Marca">
            {facets.brands.map((brand, index) => (
              <CheckboxOption
                key={brand.value}
                id={`${idPrefix}-marca-${index}`}
                label={brand.value}
                count={brand.count}
                checked={filters.brands?.includes(brand.value) ?? false}
                onChange={(checked) => update({ brands: toggle(filters.brands, brand.value, checked) })}
              />
            ))}
          </FilterGroup>
        </>
      )}

      {facets.specs.map((facet) => (
        <div key={facet.key} className="space-y-7">
          <Separator />
          <FilterGroup title={facet.label}>
            {facet.options.map((option, index) => (
              <CheckboxOption
                key={option.value}
                id={`${idPrefix}-spec-${facet.key}-${index}`}
                label={option.value}
                count={option.count}
                checked={filters.specs?.[facet.key]?.includes(option.value) ?? false}
                onChange={(checked) => {
                  const specs = { ...filters.specs };
                  const values = toggle(specs[facet.key], option.value, checked);
                  if (values) specs[facet.key] = values;
                  else delete specs[facet.key];
                  update({ specs: Object.keys(specs).length ? specs : undefined });
                }}
              />
            ))}
          </FilterGroup>
        </div>
      ))}

      {!filters.category && (
        <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          Elige una categoría para filtrar por especificaciones técnicas.
        </p>
      )}
    </div>
  );
}
