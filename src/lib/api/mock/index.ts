import { filterRentableVehicles } from "@/features/rentals/lib/maintenance";
import { queryProducts } from "@/features/catalog/lib/filter-products";
import { branchesMock } from "@/mocks/branches";
import { categoriesMock } from "@/mocks/categories";
import { faqMock, homeContentMock, newsMock } from "@/mocks/content";
import { productsMock } from "@/mocks/products";
import { rentalVehiclesMock, timeSlotsMock } from "@/mocks/rentals";
import { servicesMock } from "@/mocks/services";
import type { Cart, CartItem, Product, RentalOffer, RentalVehicle } from "@/types";
import type { ApiClient } from "../contracts";
import { ApiError } from "../errors";
import { clone, simulateLatency as wait } from "./delay";

function backendRequired(feature: string): ApiError {
  return new ApiError("SERVICE_UNAVAILABLE", `${feature} requieren el backend (API_MODE=real).`, 503);
}

function toRentalOffer(vehicle: RentalVehicle): RentalOffer {
  return {
    productId: vehicle.id,
    slug: vehicle.slug,
    name: vehicle.name,
    category: vehicle.category,
    shortDescription: vehicle.description,
    imageUrl: vehicle.image.src,
    rates: vehicle.rates.flatMap((rate) => (rate.unit === "hora" || rate.unit === "dia" ? [{ unit: rate.unit, price: rate.price }] : [])),
    branches: vehicle.availability.flatMap(({ branchId, available }) => {
      const branch = branchesMock.find((b) => b.id === branchId);
      return branch
        ? [{ branchId, branchSlug: branch.slug, branchName: branch.name, branchCity: branch.city, units: available }]
        : [];
    }),
  };
}

function findProduct(productId: string): Product {
  const product = productsMock.find((p) => p.id === productId);
  if (!product) throw new ApiError("NOT_FOUND", "El producto no existe.", 404);
  return product;
}

function toCartItem(product: Product, quantity: number): CartItem {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    image: product.images[0] ? { src: product.images[0].src, alt: product.images[0].alt } : undefined,
    unitPrice: product.price,
    quantity,
    maxQuantity: product.stock.available,
  };
}

function assertStock(input: { productId: string; quantity: number }): Product {
  const product = findProduct(input.productId);
  if (input.quantity > product.stock.available) {
    throw new ApiError("OUT_OF_STOCK", `Solo quedan ${product.stock.available} unidades de ${product.name}.`, 409);
  }
  return product;
}

/**
 * Implementación en memoria de la API. Imita los contratos de FastAPI para
 * que las páginas funcionen igual en ambos modos.
 */
export interface MockApiOptions {
  /** Latencia artificial por llamada, en milisegundos. */
  latencyMs?: number;
}

export function createMockApi({ latencyMs = 0 }: MockApiOptions = {}): ApiClient {
  const simulateLatency = () => wait(latencyMs);
  // Carrito remoto simulado en memoria (por proceso). En modo mock no hay
  // sesiones, así que la interfaz usa el carrito local del navegador.
  const now = () => new Date().toISOString();
  let remoteCart: Cart = { id: "cart-mock", items: [], updatedAt: now() };

  function findLine(itemId: string): CartItem {
    const line = remoteCart.items.find((item) => item.id === itemId);
    if (!line) throw new ApiError("NOT_FOUND", "El producto no está en tu carrito.", 404);
    return line;
  }

  return {
    catalog: {
      async listProducts(filters) {
        await simulateLatency();
        return clone(queryProducts(productsMock, filters));
      },
      async getProductBySlug(slug) {
        await simulateLatency();
        const product = productsMock.find((p) => p.slug === slug);
        return product ? clone(product) : null;
      },
      async listFeaturedProducts(limit = 4) {
        await simulateLatency();
        return clone(productsMock.filter((p) => p.featured).slice(0, limit));
      },
      async listCategories() {
        await simulateLatency();
        return clone(categoriesMock);
      },
    },
    branches: {
      async listBranches() {
        await simulateLatency();
        return clone(branchesMock);
      },
    },
    rentals: {
      async listOffers() {
        await simulateLatency();
        // Demostración sin backend: la oferta sale de los mocks y respeta la regla del 90 % (RF 3.2).
        return clone(filterRentableVehicles(rentalVehiclesMock).map(toRentalOffer));
      },
      async quote() {
        throw backendRequired("Las cotizaciones de alquiler");
      },
      async createRental() {
        throw backendRequired("Las reservas de alquiler");
      },
      async listRentals() {
        return [];
      },
      async getRental() {
        return null;
      },
      async cancelRental() {
        throw backendRequired("Las cancelaciones");
      },
      async requestRentalRefund() {
        throw backendRequired("Los reembolsos");
      },
      async listTimeSlots() {
        await simulateLatency();
        return clone(timeSlotsMock);
      },
    },
    cart: {
      async getCart() {
        await simulateLatency();
        return clone(remoteCart);
      },
      async addItem(productId, quantity) {
        await simulateLatency();
        const existing = remoteCart.items.find((item) => item.productId === productId);
        const total = (existing?.quantity ?? 0) + quantity;
        const product = assertStock({ productId, quantity: total });
        const items = existing
          ? remoteCart.items.map((item) => (item.productId === productId ? { ...item, quantity: total } : item))
          : [...remoteCart.items, { ...toCartItem(product, total), id: `line-${crypto.randomUUID()}` }];
        remoteCart = { ...remoteCart, items, updatedAt: now() };
        return clone(remoteCart);
      },
      async updateItem(itemId, quantity) {
        await simulateLatency();
        const item = findLine(itemId);
        assertStock({ productId: item.productId, quantity });
        remoteCart = {
          ...remoteCart,
          items: remoteCart.items.map((line) => (line.id === itemId ? { ...line, quantity } : line)),
          updatedAt: now(),
        };
        return clone(remoteCart);
      },
      async removeItem(itemId) {
        await simulateLatency();
        findLine(itemId);
        remoteCart = { ...remoteCart, items: remoteCart.items.filter((line) => line.id !== itemId), updatedAt: now() };
        return clone(remoteCart);
      },
    },
    payments: {
      async getConfig() {
        return { enabled: false, sandbox: false, windowMinutes: 30 };
      },
      async start() {
        throw backendRequired("Los pagos en línea");
      },
      async verify() {
        throw backendRequired("Los pagos en línea");
      },
      async getSimulation() {
        return null;
      },
      async simulate() {
        throw backendRequired("Los pagos en línea");
      },
    },
    orders: {
      async cancelOrder() {
        throw backendRequired("Las cancelaciones");
      },
      async requestOrderRefund() {
        throw backendRequired("Los reembolsos");
      },
      async createOrder(input) {
        await simulateLatency();
        const subtotal = input.items.reduce((sum, item) => sum + assertStock(item).price * item.quantity, 0);
        return {
          id: `EM-${Date.now().toString(36).toUpperCase()}`,
          status: "pending",
          subtotal,
          shippingCost: 0,
          total: subtotal,
          createdAt: now(),
        };
      },
      // En modo demostración no hay cuentas: no hay pedidos que consultar.
      async listOrders() {
        return [];
      },
      async getOrder() {
        return null;
      },
    },
    content: {
      async getHomeContent() {
        await simulateLatency();
        return clone(homeContentMock);
      },
      async listNews() {
        await simulateLatency();
        return clone(newsMock);
      },
      async listFaqs() {
        await simulateLatency();
        return clone(faqMock);
      },
      async listServices() {
        await simulateLatency();
        return clone(servicesMock);
      },
      async sendContactMessage() {
        await simulateLatency();
        return { id: `msg-${crypto.randomUUID()}` };
      },
    },
    auth: {
      async login() {
        await simulateLatency();
        throw new ApiError(
          "SERVICE_UNAVAILABLE",
          "El inicio de sesión requiere el backend (API_MODE=real). En modo demostración no hay cuentas.",
          503,
        );
      },
      async register() {
        await simulateLatency();
        throw new ApiError(
          "SERVICE_UNAVAILABLE",
          "El registro requiere el backend (API_MODE=real). En modo demostración no hay cuentas.",
          503,
        );
      },
      async logout() {},
      async updateProfile() {
        throw new ApiError("SERVICE_UNAVAILABLE", "Las cuentas requieren el backend (API_MODE=real).", 503);
      },
      async changePassword() {
        throw new ApiError("SERVICE_UNAVAILABLE", "Las cuentas requieren el backend (API_MODE=real).", 503);
      },
      async requestPasswordReset() {
        throw new ApiError("SERVICE_UNAVAILABLE", "Las cuentas requieren el backend (API_MODE=real).", 503);
      },
      async confirmPasswordReset() {
        throw new ApiError("SERVICE_UNAVAILABLE", "Las cuentas requieren el backend (API_MODE=real).", 503);
      },
      async listConsents() {
        return [];
      },
      async me() {
        return null;
      },
    },
  };
}
