import { z } from "zod";
import type { ProductFilters, ProductSort } from "@/types";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "relevancia", label: "Destacados" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
  { value: "nuevos", label: "Más recientes" },
  { value: "nombre", label: "Nombre (A – Z)" },
];

/** Prefijo de los parámetros de especificaciones: ?spec_tipo=Urbana */
export const SPEC_PARAM_PREFIX = "spec_";

const MAX_QUERY_LENGTH = 80;

const priceSchema = z.coerce.number().int().min(0).max(1_000_000_000);
const sortSchema = z.enum(["relevancia", "precio-asc", "precio-desc", "nombre", "nuevos"]);
const categorySchema = z.enum(["bicicletas", "patinetas", "patines", "drones"]);

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Convierte los parámetros de la URL en filtros tipados. Los valores
 * inválidos se ignoran en lugar de romper la página.
 */
export function parseCatalogSearchParams(params: RawSearchParams): ProductFilters {
  const filters: ProductFilters = {};

  const query = first(params.q)?.trim().slice(0, MAX_QUERY_LENGTH);
  if (query) filters.query = query;

  const category = categorySchema.safeParse(first(params.categoria));
  if (category.success) filters.category = category.data;

  const brands = toArray(params.marca);
  if (brands.length) filters.brands = brands;

  const minPrice = priceSchema.safeParse(first(params.precioMin));
  if (minPrice.success) filters.minPrice = minPrice.data;
  const maxPrice = priceSchema.safeParse(first(params.precioMax));
  if (maxPrice.success) filters.maxPrice = maxPrice.data;

  const sort = sortSchema.safeParse(first(params.orden));
  if (sort.success) filters.sort = sort.data;

  const specs: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!key.startsWith(SPEC_PARAM_PREFIX)) continue;
    const specKey = key.slice(SPEC_PARAM_PREFIX.length);
    const values = toArray(value);
    if (specKey && values.length) specs[specKey] = values;
  }
  if (Object.keys(specs).length) filters.specs = specs;

  return filters;
}

/** Operación inversa: filtros → query string (para la URL y para GET /products). */
export function catalogFiltersToSearchParams(filters: ProductFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.category) params.set("categoria", filters.category);
  if (filters.brands?.length) params.set("marca", filters.brands.join(","));
  if (filters.minPrice !== undefined) params.set("precioMin", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("precioMax", String(filters.maxPrice));
  if (filters.sort && filters.sort !== "relevancia") params.set("orden", filters.sort);
  for (const [key, values] of Object.entries(filters.specs ?? {})) {
    if (values.length) params.set(`${SPEC_PARAM_PREFIX}${key}`, values.join(","));
  }
  return params;
}

export function countActiveFilters(filters: ProductFilters): number {
  return (
    (filters.category ? 1 : 0) +
    (filters.brands?.length ?? 0) +
    (filters.minPrice !== undefined ? 1 : 0) +
    (filters.maxPrice !== undefined ? 1 : 0) +
    Object.values(filters.specs ?? {}).reduce((sum, values) => sum + values.length, 0)
  );
}
