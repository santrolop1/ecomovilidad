import { describe, expect, it } from "vitest";
import { bogotaIso, cheapestRate, timeOptions, totalUnits } from "./offers";

const offer = {
  rates: [
    { unit: "dia" as const, price: 65000 },
    { unit: "hora" as const, price: 15000 },
  ],
  branches: [
    { branchId: "a", branchSlug: "a", branchName: "A", branchCity: "Bucaramanga", units: 3 },
    { branchId: "b", branchSlug: "b", branchName: "B", branchCity: "Girón", units: 2 },
  ],
};

describe("oferta de alquiler", () => {
  it("suma unidades y elige la tarifa más baja para mostrar", () => {
    expect(totalUnits(offer)).toBe(5);
    expect(cheapestRate(offer)).toEqual({ unit: "hora", price: 15000 });
  });

  it("arma fechas con la zona horaria de Bogotá", () => {
    expect(bogotaIso("2026-11-02", "10:30")).toBe("2026-11-02T10:30:00-05:00");
    expect(new Date(bogotaIso("2026-11-02", "10:30")).toISOString()).toBe("2026-11-02T15:30:00.000Z");
  });

  it("ofrece horas en punto y medias", () => {
    expect(timeOptions("08:00", "09:30")).toEqual(["08:00", "08:30", "09:00", "09:30"]);
  });
});
