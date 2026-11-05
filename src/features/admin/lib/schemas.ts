import { z } from "zod";
import { branchServices, serviceAreaCities } from "@/lib/api/admin-schemas";

/** Validación de formularios del panel (FastAPI repite la validación). */
const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones (ej. bici-urbana-e1).")
  .max(140);
const money = z.coerce.number({ error: "Escribe un valor." }).int("Sin decimales.").min(0, "No puede ser negativo.").max(1_000_000_000);

export const specRowSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9_]{1,40}$/, "Clave: minúsculas y guion bajo."),
  label: z.string().trim().min(1, "Escribe la etiqueta.").max(60),
  value: z.string().trim().min(1, "Escribe el valor.").max(80),
  unit: z.string().trim().max(20).optional(),
  facet: z.boolean(),
});

export const productFormSchema = z
  .object({
    categoryId: z.string().min(1, "Elige una categoría."),
    name: z.string().trim().min(2, "Mínimo 2 caracteres.").max(120),
    slug,
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{3,40}$/, "Letras, números y guiones (ej. BIC-VOL-E1)."),
    brand: z.string().trim().min(1, "Escribe la marca.").max(80),
    shortDescription: z.string().trim().min(1, "Escribe un resumen.").max(200),
    description: z.string().trim().min(1, "Escribe la descripción.").max(5000),
    price: money,
    compareAtPrice: z.union([z.literal(""), money]).transform((v) => (v === "" ? null : v)),
    imageUrl: z.string().transform((v) => (v === "" ? null : v)),
    highlights: z.array(z.string().trim().max(80)).max(8, "Máximo 8 destacados."),
    specifications: z.array(specRowSchema).max(20),
    isFeatured: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((v) => v.compareAtPrice === null || v.compareAtPrice > v.price, {
    message: "Debe ser mayor que el precio actual.",
    path: ["compareAtPrice"],
  });

export type ProductFormValues = z.input<typeof productFormSchema>;

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres.").max(60),
  slug: slug.max(60),
  description: z.string().trim().max(500),
});

const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Formato HH:MM.");

export const branchFormSchema = z.object({
  slug: slug.max(80),
  name: z.string().trim().min(2, "Mínimo 2 caracteres.").max(80),
  address: z.string().trim().min(5, "Escribe la dirección.").max(160),
  neighborhood: z.string().trim().min(2, "Escribe el barrio.").max(80),
  city: z.enum(serviceAreaCities, { error: "Elige un municipio del área metropolitana." }),
  phone: z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/, "Teléfono no válido."),
  latitude: z.coerce.number().min(6.85, "Fuera del área metropolitana.").max(7.25, "Fuera del área metropolitana."),
  longitude: z.coerce.number().min(-73.3, "Fuera del área metropolitana.").max(-72.95, "Fuera del área metropolitana."),
  openingHours: z
    .array(
      z
        .object({ days: z.string().trim().min(3, "Escribe los días.").max(40), opens: time, closes: time })
        .refine((h) => h.closes > h.opens, { message: "El cierre debe ser después de la apertura.", path: ["closes"] }),
    )
    .max(7),
  services: z.array(z.enum(branchServices)),
  slotCapacity: z.coerce.number({ error: "Escribe un número." }).int("Sin decimales.").min(1, "Mínimo 1.").max(200, "Máximo 200."),
  isDemo: z.boolean(),
  isActive: z.boolean(),
});

export const stockSchema = z.coerce
  .number({ error: "Escribe un número." })
  .int("Sin decimales.")
  .min(0, "No puede ser negativo.")
  .max(100_000);

export const stockUpdateSchema = z.object({
  totalQuantity: stockSchema,
  reason: z.string().trim().min(3, "Escribe el motivo del cambio.").max(200, "Máximo 200 caracteres."),
});

/** "Bici Urbana E1" → "bici-urbana-e1" */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}
