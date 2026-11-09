import { z } from "zod";
import { catalogFiltersToSearchParams } from "@/features/catalog/lib/search-params";
import type { ApiClient } from "../contracts";
import { endpoints } from "../endpoints";
import { isApiError } from "../errors";
import type { HttpClient } from "../http-client";
import { createMockApi } from "../mock";
import {
  branchSchema,
  cartSchema,
  categoryListSchema,
  consentSchema,
  customerOrderSchema,
  customerRentalSchema,
  orderSchema,
  paymentConfigSchema,
  paymentResultSchema,
  paymentSimulationSchema,
  paymentStartSchema,
  rentalOfferSchema,
  rentalQuoteSchema,
  productListSchema,
  refundRequestSchema,
  publicProductSchema,
  sessionSchema,
  userSchema,
  newsItemSchema,
  remoteHomeContentSchema,
  manualPaymentSchema,
  timeSlotSchema,
  deliveryTrackingSchema,
} from "../schemas";

/** Revalidación de lecturas públicas desde Server Components. */
const CATALOG_REVALIDATE_S = 60;
/** La disponibilidad por sucursal cambia con cada pedido (RF 1.2). */
const AVAILABILITY_REVALIDATE_S = 15;
const CONTENT_REVALIDATE_S = 300;

/**
 * Implementación contra FastAPI (API_MODE=real).
 *
 * REAL: catálogo, categorías, sucursales, autenticación, carrito, pedidos,
 * pagos (Wompi), facturas y alquiler (oferta, cotización y reservas).
 * SIGUE EN MOCK (no existe backend todavía): contenido CMS, FAQ, servicios y
 * franjas horarias. El formulario de contacto responde "no disponible" en
 * lugar de simular un envío.
 */
export function createRealApi(http: HttpClient): ApiClient {
  const mock = createMockApi();

  return {
    catalog: {
      listProducts: (filters = {}) =>
        http.request(endpoints.products, {
          schema: productListSchema,
          query: catalogFiltersToSearchParams(filters),
          next: { revalidate: CATALOG_REVALIDATE_S, tags: ["products"] },
        }),
      async getProductBySlug(slug) {
        try {
          return await http.request(endpoints.product(slug), {
            schema: publicProductSchema,
            next: { revalidate: CATALOG_REVALIDATE_S, tags: ["products", `product:${slug}`] },
          });
        } catch (error) {
          if (isApiError(error) && error.code === "NOT_FOUND") return null;
          throw error;
        }
      },
      listFeaturedProducts: (limit = 4) =>
        http.request(endpoints.products, {
          schema: productListSchema.transform((result) => result.items),
          query: new URLSearchParams({ destacados: "true", limite: String(limit) }),
          next: { revalidate: CATALOG_REVALIDATE_S, tags: ["products"] },
        }),
      listCategories: () =>
        http.request(endpoints.categories, {
          schema: categoryListSchema,
          next: { revalidate: CATALOG_REVALIDATE_S, tags: ["categories"] },
        }),
    },
    branches: {
      listBranches: () =>
        http.request(endpoints.branches, {
          schema: z.array(branchSchema),
          next: { revalidate: AVAILABILITY_REVALIDATE_S, tags: ["branches"] },
        }),
    },
    rentals: {
      listOffers: () =>
        http.request(endpoints.rentalOffers, {
          schema: z.array(rentalOfferSchema),
          next: { revalidate: AVAILABILITY_REVALIDATE_S, tags: ["rental-offers"] },
        }),
      quote: (productId, input) =>
        http.request(endpoints.rentalQuote(productId), { method: "POST", body: input, schema: rentalQuoteSchema }),
      cancelRental: (id) =>
        http.request(`${endpoints.rental(id)}/cancel`, { method: "POST", schema: customerRentalSchema, auth: true }),
      requestRentalRefund: (id, reason) =>
        http.request(`${endpoints.rental(id)}/refund-request`, {
          method: "POST",
          body: { reason },
          schema: refundRequestSchema,
          auth: true,
        }),
      createRental: (input) =>
        http.request(endpoints.rentals, { method: "POST", body: input, schema: customerRentalSchema, auth: true }),
      listRentals: () => http.request(endpoints.rentals, { schema: z.array(customerRentalSchema), auth: true }),
      async getRental(id) {
        try {
          return await http.request(endpoints.rental(id), { schema: customerRentalSchema, auth: true });
        } catch (error) {
          if (isApiError(error) && (error.code === "NOT_FOUND" || error.code === "VALIDATION_ERROR")) return null;
          throw error;
        }
      },
      listTimeSlots: (date, branchId) =>
        http.request(endpoints.timeSlots, {
          schema: z.array(timeSlotSchema),
          query: new URLSearchParams({ date, ...(branchId ? { branch_id: branchId } : {}) }),
        }),
    },
    payments: {
      getConfig: () => http.request(endpoints.paymentsConfig, { schema: paymentConfigSchema }),
      start: (target) =>
        http.request(endpoints.payments, { method: "POST", body: target, schema: paymentStartSchema, auth: true }),
      verify: (transactionId) =>
        http.request(endpoints.paymentsVerify, {
          method: "POST",
          body: { transactionId },
          schema: paymentResultSchema,
          auth: true,
        }),
      async getSimulation(reference) {
        try {
          return await http.request(endpoints.paymentSimulation(reference), { schema: paymentSimulationSchema, auth: true });
        } catch (error) {
          if (isApiError(error) && error.code === "NOT_FOUND") return null;
          throw error;
        }
      },
      async getManualPayment(reference) {
        try {
          return await http.request(endpoints.paymentManual(reference), { schema: manualPaymentSchema, auth: true });
        } catch (error) {
          if (isApiError(error) && error.code === "NOT_FOUND") return null;
          throw error;
        }
      },
      simulate: (reference, decision) =>
        http.request(endpoints.paymentSimulation(reference), {
          method: "POST",
          body: { decision },
          schema: z.object({ transactionId: z.string() }),
          auth: true,
        }),
    },
    cart: {
      getCart: () => http.request(endpoints.cart, { schema: cartSchema, auth: true }),
      addItem: (productId, quantity) =>
        http.request(endpoints.cartItems, { method: "POST", body: { productId, quantity }, schema: cartSchema, auth: true }),
      updateItem: (itemId, quantity) =>
        http.request(endpoints.cartItem(itemId), { method: "PATCH", body: { quantity }, schema: cartSchema, auth: true }),
      removeItem: (itemId) =>
        http.request(endpoints.cartItem(itemId), { method: "DELETE", schema: cartSchema, auth: true }),
    },
    orders: {
      getTracking: async (token) => {
        try {
          return await http.request(endpoints.tracking(token), { schema: deliveryTrackingSchema, next: { revalidate: 0 } });
        } catch (error) {
          if (isApiError(error) && error.code === "NOT_FOUND") return null;
          throw error;
        }
      },
      createOrder: (input) =>
        http.request(endpoints.orders, { method: "POST", body: input, schema: orderSchema, auth: true }),
      listOrders: () => http.request(endpoints.orders, { schema: z.array(customerOrderSchema), auth: true }),
      cancelOrder: (id) =>
        http.request(`${endpoints.order(id)}/cancel`, { method: "POST", schema: customerOrderSchema, auth: true }),
      requestOrderRefund: (id, reason) =>
        http.request(`${endpoints.order(id)}/refund-request`, {
          method: "POST",
          body: { reason },
          schema: refundRequestSchema,
          auth: true,
        }),
      async getOrder(id) {
        try {
          return await http.request(endpoints.order(id), { schema: customerOrderSchema, auth: true });
        } catch (error) {
          // 404 (no existe o es de otro usuario) y 422 (id con formato inválido): no encontrado.
          if (isApiError(error) && (error.code === "NOT_FOUND" || error.code === "VALIDATION_ERROR")) return null;
          throw error;
        }
      },
    },
    content: {
      ...mock.content,
      getHomeContent: async () => {
        const [fixed, remote] = await Promise.all([
          mock.content.getHomeContent(),
          http.request(endpoints.contentHome, {
            schema: remoteHomeContentSchema,
            next: { revalidate: CONTENT_REVALIDATE_S, tags: ["content"] },
          }),
        ]);
        return { hero: fixed.hero, ...remote };
      },
      listNews: () =>
        http.request(endpoints.contentNews, {
          schema: z.array(newsItemSchema),
          next: { revalidate: CONTENT_REVALIDATE_S, tags: ["content"] },
        }),
      sendContactMessage: (input) =>
        http.request(endpoints.contact, {
          method: "POST",
          body: input,
          schema: z.object({ id: z.string() }),
          relayCookies: true, // reenvía la IP del navegador para el límite de envíos
        }),
    },
    auth: {
      login: (input) =>
        http.request(endpoints.authLogin, { method: "POST", body: input, schema: sessionSchema, relayCookies: true }),
      register: (input) =>
        http.request(endpoints.authRegister, { method: "POST", body: input, schema: sessionSchema, relayCookies: true }),
      async logout() {
        await http.request(endpoints.authLogout, { method: "POST", schema: z.null(), auth: true });
      },
      updateProfile: (input) =>
        http.request(endpoints.authMe, { method: "PATCH", body: input, schema: userSchema, auth: true }),
      async changePassword(currentPassword, newPassword) {
        await http.request(endpoints.authPassword, {
          method: "POST",
          body: { currentPassword, newPassword },
          schema: z.null(),
          auth: true,
        });
      },
      async requestPasswordReset(email) {
        await http.request(endpoints.authResetRequest, { method: "POST", body: { email }, schema: z.unknown() });
      },
      async confirmPasswordReset(token, newPassword) {
        await http.request(endpoints.authResetConfirm, { method: "POST", body: { token, newPassword }, schema: z.null() });
      },
      listConsents: () => http.request(endpoints.authConsents, { schema: z.array(consentSchema), auth: true }),
      async me() {
        try {
          return await http.request(endpoints.authMe, { schema: userSchema, auth: true });
        } catch (error) {
          if (isApiError(error) && error.code === "UNAUTHORIZED") return null;
          throw error;
        }
      },
    },
  };
}
