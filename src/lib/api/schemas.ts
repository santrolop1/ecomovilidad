import { z } from "zod";
import { categoryImages } from "@/features/catalog/lib/labels";
import type {
  Branch,
  Cart,
  FaqGroup,
  HomeContent,
  NewsItem,
  Order,
  Product,
  ProductCategory,
  ProductListResult,
  RentalVehicle,
  Service,
  Session,
  ConsentRecord,
  CustomerOrder,
  TimeSlot,
  User,
} from "@/types";

/**
 * Esquemas de validación de las respuestas de FastAPI. Cada esquema está
 * anotado con su tipo de dominio, así TypeScript detecta cualquier desajuste
 * entre el contrato y los tipos de `@/types`.
 */
const isoDate = z.string().min(1);
const categorySlug = z.enum(["bicicletas", "patinetas", "patines", "drones"]);

const imageAsset = z.object({ src: z.string().min(1), alt: z.string() });

export const productSchema: z.ZodType<Product> = z.object({
  id: z.string(),
  slug: z.string(),
  sku: z.string(),
  name: z.string(),
  brand: z.string(),
  category: categorySlug,
  shortDescription: z.string(),
  description: z.string(),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().optional(),
  images: z.array(imageAsset),
  specs: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      value: z.union([z.string(), z.number()]),
      unit: z.string().optional(),
      facet: z.boolean().optional(),
    }),
  ),
  highlights: z.array(z.string()),
  stock: z.object({
    status: z.enum(["in_stock", "low_stock", "out_of_stock"]),
    available: z.number().int().nonnegative(),
    byBranch: z.array(z.object({ branchId: z.string(), quantity: z.number().int().nonnegative() })),
  }),
  rentalVehicleSlug: z.string().optional(),
  featured: z.boolean(),
  createdAt: isoDate,
});

const facetOption = z.object({ value: z.string(), count: z.number().int().nonnegative() });

/**
 * La tienda pública conoce las 4 categorías del SRS (RF 6.1). Si el panel
 * administrativo crea otra, sus productos se omiten aquí en lugar de romper la
 * validación de todo el catálogo.
 */
function hasKnownCategory(value: unknown, key: "category" | "value" | "slug"): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    categorySlug.safeParse((value as Record<string, unknown>)[key]).success
  );
}

function onlyKnown<T>(schema: z.ZodType<T>, key: "category" | "value" | "slug") {
  return z
    .array(z.unknown())
    .transform((items) => items.filter((item) => hasKnownCategory(item, key)))
    .pipe(z.array(schema));
}

/** Producto de una categoría desconocida para la tienda = no encontrado. */
export const publicProductSchema: z.ZodType<Product | null> = z
  .unknown()
  .transform((value) => (hasKnownCategory(value, "category") ? value : null))
  .pipe(productSchema.nullable());

export const productListSchema: z.ZodType<ProductListResult> = z
  .object({
    items: onlyKnown(productSchema, "category"),
    total: z.number().int().nonnegative(),
    facets: z.object({
      categories: onlyKnown(z.object({ value: categorySlug, count: z.number().int().nonnegative() }), "value"),
      brands: z.array(facetOption),
      specs: z.array(z.object({ key: z.string(), label: z.string(), options: z.array(facetOption) })),
      priceRange: z.object({ min: z.number(), max: z.number() }),
    }),
  })
  .transform((result) => ({ ...result, total: result.items.length }));

/** GET /categories. La foto representativa es un recurso estático del frontend. */
const categoryItemSchema: z.ZodType<ProductCategory> = z
  .object({ slug: categorySlug, name: z.string(), description: z.string() })
  .transform((category) => ({
    ...category,
    image: { src: categoryImages[category.slug], alt: `Foto de referencia: ${category.name.toLowerCase()}` },
  }));

export const categoryListSchema = onlyKnown(categoryItemSchema, "slug");

export const branchSchema: z.ZodType<Branch> = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  city: z.string(),
  neighborhood: z.string(),
  address: z.string(),
  location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  phone: z.string(),
  hours: z.array(z.object({ days: z.string(), opens: z.string(), closes: z.string() })),
  services: z.array(z.enum(["venta", "alquiler", "mantenimiento", "recogida", "devolucion"])),
  inventory: z.array(z.object({ category: categorySlug, available: z.number().int().nonnegative() })),
  inventoryUpdatedAt: isoDate.optional(),
  isDemo: z.boolean(),
});

export const rentalVehicleSchema: z.ZodType<RentalVehicle> = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  category: categorySlug,
  description: z.string(),
  image: imageAsset,
  rates: z.array(z.object({ unit: z.enum(["hora", "dia", "semana"]), price: z.number().nonnegative() })),
  features: z.array(z.string()),
  availability: z.array(z.object({ branchId: z.string(), available: z.number().int().nonnegative() })),
  maintenance: z.object({
    status: z.enum(["operational", "requires_review", "in_maintenance"]),
    thresholdUsage: z.number().min(0),
    thresholdUnit: z.enum(["km", "horas_vuelo"]),
  }),
  requirements: z.array(z.string()).optional(),
});

export const timeSlotSchema: z.ZodType<TimeSlot> = z.object({
  id: z.string(),
  label: z.string(),
  start: z.string(),
  end: z.string(),
  available: z.boolean(),
});

export const cartItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  slug: z.string(),
  name: z.string(),
  brand: z.string(),
  image: z.object({ src: z.string(), alt: z.string() }).optional(),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  maxQuantity: z.number().int().nonnegative(),
  reservedUntil: isoDate.optional(),
});

export const cartSchema: z.ZodType<Cart> = z.object({
  id: z.string().optional(),
  items: z.array(cartItemSchema),
  updatedAt: isoDate,
  reservationMinutes: z.number().int().positive().optional(),
  serverTime: isoDate.optional(),
});

export const orderSchema: z.ZodType<Order> = z.object({
  id: z.string(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
  subtotal: z.number().nonnegative(),
  shippingCost: z.number().nonnegative(),
  total: z.number().nonnegative(),
  createdAt: isoDate,
  paymentRedirectUrl: z.url().optional(),
});

export const customerOrderSchema: z.ZodType<CustomerOrder> = z.object({
  id: z.string(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
  subtotal: z.number().nonnegative(),
  shippingCost: z.number().nonnegative(),
  total: z.number().nonnegative(),
  createdAt: isoDate,
  updatedAt: isoDate,
  itemCount: z.number().int().nonnegative(),
  branchName: z.string(),
  branchCity: z.string(),
  branchAddress: z.string(),
  fulfillmentMethod: z.enum(["domicilio", "recogida"]),
  deliveryAddress: z.string().optional(),
  deliveryCity: z.string().optional(),
  scheduledDate: z.string(),
  timeSlot: z.string(),
  paymentMethod: z.enum(["pse", "tarjeta", "billetera"]),
  contactName: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      slug: z.string(),
      name: z.string(),
      imageUrl: z.string().optional(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().nonnegative(),
      subtotal: z.number().nonnegative(),
    }),
  ),
});

export const consentSchema: z.ZodType<ConsentRecord> = z.object({
  purpose: z.enum(["registro", "pedido"]),
  policyVersion: z.string(),
  orderId: z.string().optional(),
  acceptedAt: isoDate,
});

export const userSchema: z.ZodType<User> = z.object({
  id: z.string(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  documentNumber: z.string().optional(),
  isAdmin: z.boolean(),
  createdAt: isoDate,
});

export const sessionSchema: z.ZodType<Session> = z.object({ user: userSchema, expiresAt: isoDate });

const cta = z.object({ label: z.string(), href: z.string() });

export const homeContentSchema: z.ZodType<HomeContent> = z.object({
  hero: z.object({ title: z.string(), subtitle: z.string(), primaryCta: cta, secondaryCta: cta }),
  valuePropositions: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      icon: z.enum(["truck", "shield", "leaf", "wrench", "map-pin", "credit-card"]),
    }),
  ),
  banners: z.array(
    z.object({ id: z.string(), title: z.string(), description: z.string(), cta, startsAt: isoDate, endsAt: isoDate }),
  ),
});

export const newsItemSchema: z.ZodType<NewsItem> = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  publishedAt: isoDate,
});

export const faqGroupSchema: z.ZodType<FaqGroup> = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(z.object({ id: z.string(), question: z.string(), answer: z.string() })),
});

export const serviceSchema: z.ZodType<Service> = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  details: z.array(z.string()),
  icon: z.enum(["store", "key", "truck", "wrench", "map-pin", "qr"]),
  href: z.string(),
});

export const idResponseSchema = z.object({ id: z.string() });
