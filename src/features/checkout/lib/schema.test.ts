import { describe, expect, it } from "vitest";
import { toFieldErrors } from "@/lib/action-result";
import { checkoutSchema } from "./schema";

const valid = {
  items: [{ productId: "prd-001", quantity: 1 }],
  customer: { fullName: "Ana Pérez", email: " ANA@Correo.com ", phone: "300 123 4567", documentType: "CC", documentNumber: "1020304050" },
  fulfillment: { method: "domicilio", address: "Calle 10 # 20-30", city: "Floridablanca", date: "2999-01-01", timeSlotId: "slot-08" },
  dataConsent: true,
};

describe("checkoutSchema", () => {
  it("acepta un pedido válido y normaliza el correo", () => {
    const parsed = checkoutSchema.parse(valid);
    expect(parsed.customer.email).toBe("ana@correo.com");
  });

  it("exige dirección para domicilio", () => {
    const result = checkoutSchema.safeParse({ ...valid, fulfillment: { ...valid.fulfillment, address: "" } });
    expect(result.success).toBe(false);
    if (!result.success) expect(toFieldErrors(result.error)).toHaveProperty(["fulfillment.address"]);
  });

  it("rechaza domicilios fuera del área metropolitana", () => {
    const result = checkoutSchema.safeParse({ ...valid, fulfillment: { ...valid.fulfillment, city: "Bogotá" } });
    expect(result.success).toBe(false);
  });

  it("exige sucursal para recogida", () => {
    const result = checkoutSchema.safeParse({ ...valid, fulfillment: { ...valid.fulfillment, method: "recogida" } });
    expect(result.success).toBe(false);
    if (!result.success) expect(toFieldErrors(result.error)).toHaveProperty(["fulfillment.branchId"]);
  });

  it("rechaza fechas pasadas", () => {
    const result = checkoutSchema.safeParse({ ...valid, fulfillment: { ...valid.fulfillment, date: "2020-01-01" } });
    expect(result.success).toBe(false);
  });

  it("exige la autorización de tratamiento de datos (Ley 1581)", () => {
    const result = checkoutSchema.safeParse({ ...valid, dataConsent: false });
    expect(result.success).toBe(false);
    if (!result.success) expect(toFieldErrors(result.error)).toHaveProperty("dataConsent");
  });
});
