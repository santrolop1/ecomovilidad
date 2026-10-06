import type {
  CatalogFacets,
  FacetOption,
  Product,
  ProductFilters,
  ProductListResult,
  SpecFacet,
} from "@/types";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function matchesQuery(product: Product, query: string): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalize(
    [product.name, product.brand, product.category, product.shortDescription, ...product.highlights].join(" "),
  );
  return terms.every((term) => haystack.includes(term));
}

function matchesSpecs(product: Product, specs: Record<string, string[]>): boolean {
  return Object.entries(specs).every(([key, accepted]) => {
    if (accepted.length === 0) return true;
    const productSpec = product.specs.find((spec) => spec.key === key);
    return productSpec !== undefined && accepted.includes(String(productSpec.value));
  });
}

type FilterKey = "query" | "category" | "brands" | "price" | "specs";

/** Aplica todos los filtros excepto los indicados (para calcular facetas). */
function applyFilters(products: Product[], filters: ProductFilters, skip: FilterKey[] = []): Product[] {
  return products.filter((product) => {
    if (!skip.includes("query") && filters.query && !matchesQuery(product, filters.query)) return false;
    if (!skip.includes("category") && filters.category && product.category !== filters.category) return false;
    if (!skip.includes("brands") && filters.brands?.length && !filters.brands.includes(product.brand)) return false;
    if (!skip.includes("price")) {
      if (filters.minPrice !== undefined && product.price < filters.minPrice) return false;
      if (filters.maxPrice !== undefined && product.price > filters.maxPrice) return false;
    }
    if (!skip.includes("specs") && filters.specs && !matchesSpecs(product, filters.specs)) return false;
    return true;
  });
}

function sortProducts(products: Product[], sort: ProductFilters["sort"]): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "precio-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "precio-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "nombre":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
    case "nuevos":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "relevancia":
    default:
      // Destacados primero, luego disponibles, luego agotados.
      return sorted.sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        const aOut = a.stock.status === "out_of_stock";
        const bOut = b.stock.status === "out_of_stock";
        if (aOut !== bOut) return aOut ? 1 : -1;
        return 0;
      });
  }
}

function countBy(values: string[]): FacetOption[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, "es"));
}

function buildFacets(products: Product[], filters: ProductFilters): CatalogFacets {
  const forCategories = applyFilters(products, filters, ["category", "specs"]);
  const forBrands = applyFilters(products, filters, ["brands"]);
  const forSpecs = applyFilters(products, filters, ["specs"]);

  const specMap = new Map<string, { label: string; values: string[] }>();
  // Las especificaciones solo tienen sentido dentro de una categoría.
  if (filters.category) {
    for (const product of forSpecs) {
      for (const spec of product.specs) {
        if (!spec.facet) continue;
        const entry = specMap.get(spec.key) ?? { label: spec.label, values: [] };
        entry.values.push(String(spec.value));
        specMap.set(spec.key, entry);
      }
    }
  }
  const specs: SpecFacet[] = [...specMap.entries()].map(([key, { label, values }]) => ({
    key,
    label,
    options: countBy(values),
  }));

  const categoryScope = filters.category ? products.filter((p) => p.category === filters.category) : products;
  const prices = categoryScope.map((p) => p.price);

  return {
    categories: countBy(forCategories.map((p) => p.category)) as CatalogFacets["categories"],
    brands: countBy(forBrands.map((p) => p.brand)),
    specs,
    priceRange: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    },
  };
}

/**
 * Implementación de referencia del filtrado del catálogo. En modo mock se
 * ejecuta en el servidor de Next.js; en modo REST lo hará FastAPI.
 */
export function queryProducts(products: Product[], filters: ProductFilters = {}): ProductListResult {
  const items = sortProducts(applyFilters(products, filters), filters.sort);
  return { items, total: items.length, facets: buildFacets(products, filters) };
}
