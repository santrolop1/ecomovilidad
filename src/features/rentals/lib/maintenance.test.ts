import { describe, expect, it } from "vitest";
import { rentalVehiclesMock } from "@/mocks/rentals";
import { filterRentableVehicles, requiresReview } from "./maintenance";

const base = rentalVehiclesMock[0];

describe("regla de mantenimiento (RF 3.2)", () => {
  it("bloquea el activo al llegar al 90% del umbral", () => {
    expect(requiresReview({ maintenance: { ...base.maintenance, thresholdUsage: 0.89 } })).toBe(false);
    expect(requiresReview({ maintenance: { ...base.maintenance, thresholdUsage: 0.9 } })).toBe(true);
  });

  it("bloquea activos que ya no están operativos", () => {
    expect(requiresReview({ maintenance: { ...base.maintenance, status: "in_maintenance", thresholdUsage: 0.1 } })).toBe(true);
  });

  it("oculta del catálogo de alquiler los activos que requieren revisión", () => {
    const slugs = filterRentableVehicles(rentalVehiclesMock).map((v) => v.slug);
    expect(slugs).not.toContain("patineta-todo-terreno");
    expect(slugs).toContain("bicicleta-electrica-urbana");
  });
});
