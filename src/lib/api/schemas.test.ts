import { describe, expect, it } from "vitest";
import { customerOrderSchema } from "./schemas";

const base = {
  id: "o1",
  status: "pending",
  subtotal: 1000,
  shippingCost: 0,
  total: 1000,
  createdAt: "2026-10-06T10:00:00Z",
  updatedAt: "2026-10-06T10:00:00Z",
  itemCount: 1,
  branchName: "Cabecera",
  branchCity: "Bucaramanga",
  branchAddress: "Carrera 35 # 48-20",
  fulfillmentMethod: "recogida",
  scheduledDate: "2026-10-07",
  timeSlot: "slot-10",
  paymentMethod: "pse",
  contactName: "Ana",
  contactEmail: "ana@correo.com",
  contactPhone: "3001234567",
  items: [{ productId: "p1", slug: "x", name: "X", quantity: 1, unitPrice: 1000, subtotal: 1000 }],
};

describe("contrato de pedidos con FastAPI", () => {
  it("acepta un pedido de recogida sin dirección ni imagen", () => {
    expect(customerOrderSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza estados que el backend no define", () => {
    expect(customerOrderSchema.safeParse({ ...base, status: "shipped" }).success).toBe(false);
  });
});
