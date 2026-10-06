export type ProductCategorySlug = "bicicletas" | "patinetas" | "patines" | "drones";

export interface ProductCategory {
  slug: ProductCategorySlug;
  name: string;
  description: string;
  image: ImageAsset;
}

export interface ImageAsset {
  src: string;
  alt: string;
}

export interface ProductSpec {
  key: string;
  label: string;
  value: string | number;
  unit?: string;
  /** Si es true, la especificación se ofrece como filtro en el catálogo. */
  facet?: boolean;
}

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface BranchStock {
  branchId: string;
  quantity: number;
}

export interface ProductStock {
  status: StockStatus;
  available: number;
  byBranch: BranchStock[];
}

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  brand: string;
  category: ProductCategorySlug;
  shortDescription: string;
  description: string;
  /** Precio en pesos colombianos (COP), IVA incluido. */
  price: number;
  compareAtPrice?: number;
  images: ImageAsset[];
  specs: ProductSpec[];
  highlights: string[];
  stock: ProductStock;
  /** Existe un vehículo equivalente en la flota de alquiler. */
  rentalVehicleSlug?: string;
  featured: boolean;
  /** ISO 8601 */
  createdAt: string;
}

export type ProductSort = "relevancia" | "precio-asc" | "precio-desc" | "nombre" | "nuevos";

export interface ProductFilters {
  query?: string;
  category?: ProductCategorySlug;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  /** clave de especificación -> valores aceptados */
  specs?: Record<string, string[]>;
  sort?: ProductSort;
}

export interface FacetOption {
  value: string;
  count: number;
}

export interface SpecFacet {
  key: string;
  label: string;
  options: FacetOption[];
}

export interface CatalogFacets {
  categories: (FacetOption & { value: ProductCategorySlug })[];
  brands: FacetOption[];
  specs: SpecFacet[];
  priceRange: { min: number; max: number };
}

export interface ProductListResult {
  items: Product[];
  total: number;
  facets: CatalogFacets;
}
