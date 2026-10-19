import "server-only";
import { z } from "zod";
import { serverEnv } from "@/config/server-env";
import {
  adminBranchDetailSchema,
  adminBranchSchema,
  adminCategorySchema,
  adminOrderDetailSchema,
  adminOrderSummarySchema,
  adminProductDetailSchema,
  adminProductSchema,
  adminRentalSchema,
  adminUserDetailSchema,
  adminUserSchema,
  dashboardSchema,
  inventoryRowSchema,
  type OrderStatusValue,
  pageSchema,
  type RentalStatusValue,
  type RentalUnitStatusValue,
  rentalUnitSchema,
} from "./admin-schemas";
import { ApiError } from "./errors";
import { createHttpClient, type RequestOptions } from "./http-client";

/**
 * Cliente del API administrativo de FastAPI (/api/v1/admin). Solo existe en
 * API_MODE=real: el panel no tiene versión mock. FastAPI valida el rol en
 * cada llamada; este módulo nunca decide permisos.
 */
const http = serverEnv.apiMode === "real" && serverEnv.apiBaseUrl ? createHttpClient(serverEnv.apiBaseUrl) : null;

export const isAdminAvailable = http !== null;

type Query = Record<string, string | number | boolean | undefined | null>;

function toParams(query: Query = {}): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  return params;
}

function call<T>(path: string, options: Omit<RequestOptions<T>, "auth">): Promise<T> {
  if (!http) {
    return Promise.reject(new ApiError("SERVICE_UNAVAILABLE", "El panel requiere API_MODE=real con FastAPI.", 503));
  }
  return http.request(`/admin${path}`, { ...options, auth: true });
}

const get = <T>(path: string, schema: z.ZodType<T>, query?: Query) => call(path, { schema, query: toParams(query) });
const send = <T>(method: "POST" | "PATCH" | "PUT", path: string, schema: z.ZodType<T>, body: unknown) =>
  call(path, { method, schema, body });

export const adminApi = {
  dashboard: () => get("/dashboard", dashboardSchema),

  listProducts: (query: Query) => get("/products", pageSchema(adminProductSchema), query),
  getProduct: (id: string) => get(`/products/${encodeURIComponent(id)}`, adminProductDetailSchema),
  createProduct: (body: unknown) => send("POST", "/products", adminProductDetailSchema, body),
  updateProduct: (id: string, body: unknown) =>
    send("PATCH", `/products/${encodeURIComponent(id)}`, adminProductDetailSchema, body),
  setStock: (productId: string, branchId: string, totalQuantity: number) =>
    send(
      "PUT",
      `/products/${encodeURIComponent(productId)}/inventory/${encodeURIComponent(branchId)}`,
      adminProductDetailSchema,
      { totalQuantity },
    ),

  listCategories: () => get("/categories", z.array(adminCategorySchema)),
  createCategory: (body: unknown) => send("POST", "/categories", adminCategorySchema, body),
  updateCategory: (id: string, body: unknown) =>
    send("PATCH", `/categories/${encodeURIComponent(id)}`, adminCategorySchema, body),

  listBranches: () => get("/branches", z.array(adminBranchSchema)),
  getBranch: (id: string) => get(`/branches/${encodeURIComponent(id)}`, adminBranchDetailSchema),
  createBranch: (body: unknown) => send("POST", "/branches", adminBranchDetailSchema, body),
  updateBranch: (id: string, body: unknown) =>
    send("PATCH", `/branches/${encodeURIComponent(id)}`, adminBranchDetailSchema, body),

  listInventory: (query: Query) => get("/inventory", pageSchema(inventoryRowSchema), query),

  listOrders: (query: Query) => get("/orders", pageSchema(adminOrderSummarySchema), query),
  getOrder: (id: string) => get(`/orders/${encodeURIComponent(id)}`, adminOrderDetailSchema),
  updateOrderStatus: (id: string, status: OrderStatusValue) =>
    send("PATCH", `/orders/${encodeURIComponent(id)}`, adminOrderDetailSchema, { status }),

  listUsers: (query: Query) => get("/users", pageSchema(adminUserSchema), query),
  getUser: (id: string) => get(`/users/${encodeURIComponent(id)}`, adminUserDetailSchema),
  setUserActive: (id: string, isActive: boolean) =>
    send("PATCH", `/users/${encodeURIComponent(id)}`, adminUserDetailSchema, { isActive }),

  listRentals: (query: Query) => get("/rentals", pageSchema(adminRentalSchema), query),
  getRental: (id: string) => get(`/rentals/${encodeURIComponent(id)}`, adminRentalSchema),
  updateRentalStatus: (id: string, status: RentalStatusValue) =>
    send("PATCH", `/rentals/${encodeURIComponent(id)}`, adminRentalSchema, { status }),
  listRentalUnits: () => get("/rental-units", z.array(rentalUnitSchema)),
  updateRentalUnit: (id: string, status: RentalUnitStatusValue) =>
    send("PATCH", `/rental-units/${encodeURIComponent(id)}`, rentalUnitSchema, { status }),
};
