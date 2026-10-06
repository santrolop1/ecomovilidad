import type { ProductCategorySlug } from "@/types";

/** Foto representativa de cada categoría (ver src/config/image-credits.ts). */
export const categoryImages: Record<ProductCategorySlug, string> = {
  bicicletas: "/images/products/voltra-urbana-e1.webp",
  patinetas: "/images/products/voltra-s2-urbana.webp",
  patines: "/images/products/patinova-city-80.webp",
  drones: "/images/products/aeroandes-mini-4k.webp",
};

export const categoryLabels: Record<ProductCategorySlug, string> = {
  bicicletas: "Bicicletas",
  patinetas: "Patinetas",
  patines: "Patines",
  drones: "Drones",
};
