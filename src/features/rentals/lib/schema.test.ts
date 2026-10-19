import { describe, expect, it } from "vitest";
import { rentalBookingSchema } from "./schema";

const valid = {
  productId: "3f2a9c1b-0000-4000-8000-000000000001",
  branchId: "3f2a9c1b-0000-4000-8000-000000000002",
  startAt: "2026-11-02T10:00:00-05:00",
  endAt: "2026-11-02T13:00:00-05:00",
  customer: { fullName: "Ana Pérez", email: "ANA@correo.com", phone: "300 123 4567", documentType: "CC", documentNumber: "1098765432" },
  dataConsent: true,
};

describe("rentalBookingSchema", () => {
  it("acepta una reserva válida", () => {
    expect(rentalBookingSchema.parse(valid).customer.email).toBe("ana@correo.com");
  });

  it("exige devolución posterior a la recogida, fechas con zona horaria y consentimiento", () => {
    expect(rentalBookingSchema.safeParse({ ...valid, endAt: valid.startAt }).success).toBe(false);
    expect(rentalBookingSchema.safeParse({ ...valid, startAt: "2026-11-02T10:00:00" }).success).toBe(false);
    expect(rentalBookingSchema.safeParse({ ...valid, dataConsent: false }).success).toBe(false);
  });
});
