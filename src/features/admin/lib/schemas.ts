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

const optionalId = z.string().uuid().optional().or(z.literal("").transform(() => undefined));

export const gpsDeviceFormSchema = z.object({
  code: z.string().trim().min(2, "Escribe un código.").max(30),
  kind: z.enum(["bicicleta", "patineta", "dron", "domicilio"]),
  branchId: optionalId,
  courierId: optionalId,
});

export const geofenceFormSchema = z.object({
  name: z.string().trim().min(3, "Escribe un nombre.").max(80),
  latitude: z.coerce.number({ error: "Escribe un número." }).min(-5, "Fuera de Colombia.").max(14, "Fuera de Colombia."),
  longitude: z.coerce.number({ error: "Escribe un número." }).min(-80, "Fuera de Colombia.").max(-66, "Fuera de Colombia."),
  radiusM: z.coerce.number({ error: "Escribe un número." }).int("Sin decimales.").min(50, "Mínimo 50 metros.").max(100_000, "Máximo 100 km."),
});

const bogotaDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Elige fecha y hora.")
  .transform((value) => `${value.slice(0, 16)}:00-05:00`);

export const valuePropFormSchema = z.object({
  title: z.string().trim().min(3, "Mínimo 3 caracteres.").max(80),
  description: z.string().trim().min(3, "Escribe la descripción.").max(240),
  icon: z.enum(["truck", "shield", "leaf", "wrench", "map-pin", "credit-card"]),
  position: z.coerce.number({ error: "Escribe un número." }).int("Sin decimales.").min(0).max(100),
  isActive: z.boolean(),
});

export const bannerFormSchema = z
  .object({
    title: z.string().trim().min(3, "Mínimo 3 caracteres.").max(80),
    description: z.string().trim().min(3, "Escribe la descripción.").max(240),
    ctaLabel: z.string().trim().min(2, "Escribe el texto del botón.").max(40),
    ctaHref: z
      .string()
      .trim()
      .regex(/^\/([A-Za-z0-9\-._~?=&%#][A-Za-z0-9\-._~/?=&%#]*)?$/, "Usa una ruta interna, p. ej. /catalogo.")
      .max(200),
    startsAt: bogotaDateTime,
    endsAt: bogotaDateTime,
    isActive: z.boolean(),
  })
  .refine((b) => b.endsAt > b.startsAt, { message: "Debe terminar después de empezar.", path: ["endsAt"] });

export const newsFormSchema = z.object({
  slug: slug.max(80),
  title: z.string().trim().min(3, "Mínimo 3 caracteres.").max(120),
  excerpt: z.string().trim().min(3, "Escribe el resumen.").max(300),
  publishedAt: bogotaDateTime,
  isPublished: z.boolean(),
});

export const courierFormSchema = z.object({
  name: z.string().trim().min(3, "Escribe el nombre.").max(120),
  phone: z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/, "Teléfono no válido."),
});

export const deliveryStatusSchema = z
  .object({
    status: z.enum(["creado", "en_recogida", "en_transito", "fallido"]),
    note: z.string().trim().max(300, "Máximo 300 caracteres.").optional(),
  })
  .refine((d) => d.status !== "fallido" || (d.note?.length ?? 0) >= 3, {
    message: "Escribe por qué falló la entrega.",
    path: ["note"],
  });

export const deliveryValidationSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("qr"), code: z.string().trim().regex(/^\d{6}$/, "El código tiene 6 dígitos.") }),
  z.object({
    method: z.literal("firma"),
    signerName: z.string().trim().min(3, "Escribe quién recibe.").max(120),
    signatureImage: z.string().startsWith("data:image/png;base64,", "Falta la firma.").max(300_000, "La firma es muy grande."),
  }),
]);

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
