import type { Branch } from "@/types";

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Área metropolitana de Bucaramanga: Bucaramanga, Floridablanca, Girón y Piedecuesta. */
export const METRO_BOUNDS: BoundingBox = { minLat: 6.95, maxLat: 7.16, minLng: -73.2, maxLng: -73.02 };

/** [[sur, oeste], [norte, este]] en el formato de Leaflet. */
export function toLatLngBounds(bounds: BoundingBox, padding = 0): [[number, number], [number, number]] {
  return [
    [bounds.minLat - padding, bounds.minLng - padding],
    [bounds.maxLat + padding, bounds.maxLng + padding],
  ];
}

/** Total de unidades disponibles de una sucursal (todas las categorías). */
export function availableUnits(branch: Branch): number {
  return branch.inventory.reduce((sum, entry) => sum + entry.available, 0);
}
