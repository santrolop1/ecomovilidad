import { describe, expect, it } from "vitest";
import { branchesMock } from "@/mocks/branches";
import { availableUnits, METRO_BOUNDS, toLatLngBounds } from "./geo";

describe("geo", () => {
  it("convierte la caja del área metropolitana al formato de Leaflet, con margen opcional", () => {
    expect(toLatLngBounds(METRO_BOUNDS)).toEqual([
      [METRO_BOUNDS.minLat, METRO_BOUNDS.minLng],
      [METRO_BOUNDS.maxLat, METRO_BOUNDS.maxLng],
    ]);
    const [[south, west], [north, east]] = toLatLngBounds(METRO_BOUNDS, 0.1);
    expect(south).toBeCloseTo(METRO_BOUNDS.minLat - 0.1);
    expect(east).toBeCloseTo(METRO_BOUNDS.maxLng + 0.1);
    expect(north).toBeGreaterThan(south);
    expect(east).toBeGreaterThan(west);
  });

  it("todas las sucursales caen dentro del área metropolitana", () => {
    for (const branch of branchesMock) {
      expect(branch.location.lat).toBeGreaterThanOrEqual(METRO_BOUNDS.minLat);
      expect(branch.location.lat).toBeLessThanOrEqual(METRO_BOUNDS.maxLat);
      expect(branch.location.lng).toBeGreaterThanOrEqual(METRO_BOUNDS.minLng);
      expect(branch.location.lng).toBeLessThanOrEqual(METRO_BOUNDS.maxLng);
    }
  });

  it("suma las unidades disponibles de todas las categorías", () => {
    const branch = branchesMock[0];
    expect(availableUnits(branch)).toBe(branch.inventory.reduce((sum, entry) => sum + entry.available, 0));
  });
});
