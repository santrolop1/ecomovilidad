import Link from "next/link";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FilterOption {
  value: string;
  label: string;
}

export interface SelectFilter {
  name: string;
  label: string;
  value?: string;
  options: FilterOption[];
}

interface FilterBarProps {
  action: string;
  query?: string;
  searchPlaceholder?: string;
  selects?: SelectFilter[];
  /** Controles extra (p. ej. casillas) dentro del mismo formulario. */
  children?: ReactNode;
}

/**
 * Formulario GET: los filtros viven en la URL, funcionan sin JavaScript y se
 * pueden compartir. Los select nativos son accesibles y cómodos en táctil.
 */
export function FilterBar({ action, query, searchPlaceholder = "Buscar", selects = [], children }: FilterBarProps) {
  return (
    <form action={action} method="get" role="search" className="flex flex-col gap-3 xl:flex-row xl:items-end">
      <div className="relative min-w-0 flex-1 xl:min-w-64">
        <label htmlFor="admin-q" className="sr-only">
          {searchPlaceholder}
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input id="admin-q" name="q" type="search" defaultValue={query} placeholder={searchPlaceholder} maxLength={80} className="h-11 bg-card pl-10" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
        {selects.map((select) => (
          <div key={select.name} className="min-w-0">
            <label htmlFor={`admin-${select.name}`} className="mb-1 block text-xs text-muted-foreground">
              {select.label}
            </label>
            <select
              id={`admin-${select.name}`}
              name={select.name}
              defaultValue={select.value ?? ""}
              className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm sm:w-auto"
            >
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
        {children}
        <div className="col-span-2 flex gap-2 sm:col-span-1">
          <Button type="submit" size="lg" className="h-11 flex-1 rounded-full px-5 sm:flex-none">
            Filtrar
          </Button>
          <Button asChild variant="ghost" size="lg" className="h-11 rounded-full">
            <Link href={action}>Limpiar</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
