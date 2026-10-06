import { describe, expect, it } from "vitest";
import { isApiError } from "../errors";
import { createMockApi } from "./index";

describe("createMockApi", () => {
  const api = createMockApi();

  it("devuelve null para un producto inexistente", async () => {
    await expect(api.catalog.getProductBySlug("no-existe")).resolves.toBeNull();
  });

  it("no expone referencias mutables a los mocks", async () => {
    const product = await api.catalog.getProductBySlug("voltra-urbana-e1");
    product!.name = "Mutado";
    const again = await api.catalog.getProductBySlug("voltra-urbana-e1");
    expect(again?.name).toBe("Voltra Urbana E1");
  });

  it("excluye vehículos que requieren revisión", async () => {
    const vehicles = await api.rentals.listRentalVehicles();
    expect(vehicles.every((v) => v.maintenance.thresholdUsage < 0.9)).toBe(true);
  });

  it("agrega, actualiza y elimina líneas del carrito por id", async () => {
    let cart = await api.cart.addItem("prd-001", 1);
    const lineId = cart.items[0].id!;
    cart = await api.cart.updateItem(lineId, 2);
    expect(cart.items[0].quantity).toBe(2);
    cart = await api.cart.removeItem(lineId);
    expect(cart.items).toEqual([]);
  });

  it("rechaza cantidades mayores al inventario", async () => {
    const error = await api.cart.addItem("prd-302", 5).catch((e: unknown) => e);
    expect(isApiError(error) && error.code).toBe("OUT_OF_STOCK");
  });

  it("calcula el total de la orden con precios del catálogo", async () => {
    const order = await api.orders.createOrder({
      items: [{ productId: "prd-201", quantity: 2 }],
      customer: { fullName: "Ana Pérez", email: "ana@correo.com", phone: "3001234567", documentType: "CC", documentNumber: "1234567" },
      fulfillment: { method: "recogida", branchId: "br-bga-cabecera", date: "2026-12-01", timeSlotId: "slot-08" },
      paymentMethod: "pse",
      dataConsent: true,
    });
    expect(order.total).toBe(2 * 689_000);
    expect(order.status).toBe("pending");
  });

  it("indica que la autenticación aún no está disponible", async () => {
    const error = await api.auth.login({ email: "a@b.co", password: "x" }).catch((e: unknown) => e);
    expect(isApiError(error) && error.code).toBe("SERVICE_UNAVAILABLE");
  });
});
