import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { api } from "@/lib/api";

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/catalogo", priority: 0.9, changeFrequency: "daily" },
  { path: "/alquiler", priority: 0.8, changeFrequency: "daily" },
  { path: "/sucursales", priority: 0.7, changeFrequency: "weekly" },
  { path: "/servicios", priority: 0.6, changeFrequency: "monthly" },
  { path: "/nosotros", priority: 0.5, changeFrequency: "monthly" },
  { path: "/ayuda", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contacto", priority: 0.4, changeFrequency: "monthly" },
  { path: "/privacidad", priority: 0.2, changeFrequency: "monthly" },
  { path: "/terminos", priority: 0.2, changeFrequency: "monthly" },
  { path: "/creditos", priority: 0.1, changeFrequency: "monthly" },
];

/** Sitemap autogenerado (RF 1.3): rutas estáticas + fichas de producto. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { items: products } = await api.catalog.listProducts();
  const now = new Date();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${siteConfig.url}${route.path === "/" ? "" : route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...products.map((product) => ({
      url: `${siteConfig.url}/catalogo/${product.slug}`,
      lastModified: new Date(product.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
