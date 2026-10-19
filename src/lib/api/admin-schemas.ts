import { z } from "zod";

/** Respuestas de /api/v1/admin. Los tipos se derivan de los esquemas. */
const id = z.string();
const isoDate = z.string().min(1);

export const orderStatuses = ["pending", "paid", "confirmed", "cancelled", "completed"] as const;
export const rentalUnitStatuses = ["operativo", "mantenimiento", "retirado"] as const;
export const rentalStatuses = ["pending", "confirmed", "active", "completed", "cancelled"] as const;
export const branchServices = ["venta", "alquiler", "mantenimiento", "recogida", "devolucion"] as const;
export const serviceAreaCities = ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta"] as const;

const orderStatus = z.enum(orderStatuses);
const rentalStatus = z.enum(rentalStatuses);

export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), total: z.number(), page: z.number(), pageSize: z.number() });

export const specSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string().nullish(),
  facet: z.boolean(),
});

export const adminProductSchema = z.object({
  id,
  slug: z.string(),
  sku: z.string(),
  name: z.string(),
  brand: z.string(),
  category: z.object({ id, slug: z.string(), name: z.string() }),
  shortDescription: z.string(),
  description: z.string(),
  price: z.number(),
  compareAtPrice: z.number().nullable(),
  specifications: z.array(specSchema),
  highlights: z.array(z.string()),
  imageUrl: z.string().nullable(),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  available: z.number(),
  reserved: z.number(),
  total: z.number(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const inventoryRowSchema = z.object({
  id: id.nullable(),
  productId: id,
  productName: z.string(),
  productSlug: z.string(),
  sku: z.string(),
  branchId: id,
  branchName: z.string(),
  city: z.string(),
  available: z.number(),
  reserved: z.number(),
  total: z.number(),
  sold: z.number(),
  updatedAt: isoDate.nullable(),
});

export const adminProductDetailSchema = adminProductSchema.extend({ inventory: z.array(inventoryRowSchema) });

export const adminCategorySchema = z.object({
  id,
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  productCount: z.number(),
});

const openingHours = z.object({ days: z.string(), opens: z.string(), closes: z.string() });

export const adminBranchSchema = z.object({
  id,
  slug: z.string(),
  name: z.string(),
  address: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  phone: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  openingHours: z.array(openingHours),
  services: z.array(z.enum(branchServices)),
  isDemo: z.boolean(),
  isActive: z.boolean(),
  available: z.number(),
  reserved: z.number(),
  total: z.number(),
  updatedAt: isoDate,
});

export const adminBranchDetailSchema = adminBranchSchema.extend({ inventory: z.array(inventoryRowSchema) });

export const adminOrderSummarySchema = z.object({
  id,
  status: orderStatus,
  total: z.number(),
  itemCount: z.number(),
  contactName: z.string(),
  userEmail: z.string(),
  fulfillmentMethod: z.enum(["domicilio", "recogida"]),
  branchName: z.string(),
  scheduledDate: z.string(),
  createdAt: isoDate,
});

export const adminPaymentSchema = z.object({
  status: z.enum(["pending", "approved", "declined", "voided", "error"]),
  reference: z.string(),
  providerTransactionId: z.string().nullable().optional(),
  paymentMethodType: z.string().nullable().optional(),
  statusMessage: z.string().nullable().optional(),
  approvedAt: isoDate.nullable().optional(),
  requiresRefund: z.boolean(),
  createdAt: isoDate,
});

const invoiceRef = z.object({ id, number: z.string(), issuedAt: isoDate });

export const adminOrderDetailSchema = adminOrderSummarySchema.extend({
  subtotal: z.number(),
  shippingCost: z.number(),
  paymentMethod: z.enum(["pse", "tarjeta", "billetera"]).nullable().optional(),
  paymentExpiresAt: isoDate.nullable().optional(),
  payments: z.array(adminPaymentSchema),
  invoice: invoiceRef.nullable().optional(),
  deliveryAddress: z.string().nullable(),
  deliveryCity: z.string().nullable(),
  timeSlot: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  documentType: z.string(),
  documentNumber: z.string(),
  branchId: id,
  branchCity: z.string(),
  user: z.object({ id, email: z.string(), firstName: z.string(), lastName: z.string() }),
  items: z.array(
    z.object({
      productId: id,
      name: z.string(),
      sku: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      subtotal: z.number(),
    }),
  ),
  updatedAt: isoDate,
  allowedTransitions: z.array(orderStatus),
});

export const adminUserSchema = z.object({
  id,
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  documentNumber: z.string().nullable(),
  isActive: z.boolean(),
  isAdmin: z.boolean(),
  orderCount: z.number(),
  createdAt: isoDate,
});

export const adminUserDetailSchema = adminUserSchema.extend({ recentOrders: z.array(adminOrderSummarySchema) });

export const adminRentalSchema = z.object({
  id,
  status: rentalStatus,
  userEmail: z.string(),
  userName: z.string(),
  productName: z.string(),
  branchName: z.string(),
  unitCode: z.string().nullable().optional(),
  startAt: isoDate,
  endAt: isoDate,
  price: z.number(),
  createdAt: isoDate,
  payments: z.array(adminPaymentSchema).default([]),
  invoice: invoiceRef.nullable().optional(),
  allowedTransitions: z.array(rentalStatus).default([]),
});

export const rentalUnitSchema = z.object({
  id,
  code: z.string(),
  status: z.enum(rentalUnitStatuses),
  productId: id,
  productName: z.string(),
  branchId: id,
  branchName: z.string(),
  isDemo: z.boolean(),
  nextRentalStart: isoDate.nullable().optional(),
});

export const dashboardSchema = z.object({
  productsTotal: z.number(),
  productsActive: z.number(),
  productsFeatured: z.number(),
  productsWithoutImage: z.number(),
  categories: z.number(),
  branchesTotal: z.number(),
  branchesActive: z.number(),
  branchesDemo: z.number(),
  usersTotal: z.number(),
  usersActive: z.number(),
  admins: z.number(),
  ordersTotal: z.number(),
  ordersByStatus: z.record(orderStatus, z.number()),
  revenueConfirmed: z.number(),
  paymentsRequiringRefund: z
    .array(
      z.object({
        reference: z.string(),
        amount: z.number(),
        orderId: id.nullable().optional(),
        rentalId: id.nullable().optional(),
        approvedAt: isoDate.nullable().optional(),
      }),
    )
    .default([]),
  unitsAvailable: z.number(),
  unitsReserved: z.number(),
  unitsTotal: z.number(),
  rentalsTotal: z.number(),
  rentalsByStatus: z.record(rentalStatus, z.number()),
  lowStockThreshold: z.number(),
  lowStock: z.array(
    z.object({ productId: id, name: z.string(), sku: z.string(), available: z.number(), reserved: z.number() }),
  ),
  recentOrders: z.array(adminOrderSummarySchema),
});

export type OrderStatusValue = (typeof orderStatuses)[number];
export type RentalStatusValue = (typeof rentalStatuses)[number];
export type AdminProduct = z.infer<typeof adminProductSchema>;
export type AdminProductDetail = z.infer<typeof adminProductDetailSchema>;
export type InventoryRow = z.infer<typeof inventoryRowSchema>;
export type AdminCategory = z.infer<typeof adminCategorySchema>;
export type AdminBranch = z.infer<typeof adminBranchSchema>;
export type AdminBranchDetail = z.infer<typeof adminBranchDetailSchema>;
export type AdminOrderSummary = z.infer<typeof adminOrderSummarySchema>;
export type AdminOrderDetail = z.infer<typeof adminOrderDetailSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminUserDetail = z.infer<typeof adminUserDetailSchema>;
export type AdminRental = z.infer<typeof adminRentalSchema>;
export type AdminPayment = z.infer<typeof adminPaymentSchema>;
export type RentalUnit = z.infer<typeof rentalUnitSchema>;
export type RentalUnitStatusValue = (typeof rentalUnitStatuses)[number];
export type Dashboard = z.infer<typeof dashboardSchema>;
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
