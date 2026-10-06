import type { Branch, GeoPoint } from "@/types";

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Área metropolitana de Bucaramanga: Bucaramanga, Floridablanca, Girón y Piedecuesta. */
export const METRO_BOUNDS: BoundingBox = { minLat: 6.95, maxLat: 7.16, minLng: -73.2, maxLng: -73.02 };

/** Lienzo con la misma proporción que METRO_BOUNDS (evita deformar distancias). */
export const METRO_CANVAS = { width: 400, height: 466 };

/** Proyección equirectangular de una coordenada a un lienzo de `width × height`. */
export function project(point: GeoPoint, bounds: BoundingBox, width: number, height: number) {
  return {
    x: ((point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width,
    y: ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat)) * height,
  };
}

export interface CityCluster {
  city: string;
  location: GeoPoint;
  branchIds: string[];
}

/** Agrupa sucursales por municipio: a escala metropolitana, las de un mismo municipio se solapan. */
export function clusterByCity(branches: Branch[]): CityCluster[] {
  const clusters = new Map<string, CityCluster>();
  for (const branch of branches) {
    const cluster = clusters.get(branch.city);
    if (cluster) {
      const n = cluster.branchIds.length;
      cluster.location = {
        lat: (cluster.location.lat * n + branch.location.lat) / (n + 1),
        lng: (cluster.location.lng * n + branch.location.lng) / (n + 1),
      };
      cluster.branchIds.push(branch.id);
    } else {
      clusters.set(branch.city, { city: branch.city, location: { ...branch.location }, branchIds: [branch.id] });
    }
  }
  return [...clusters.values()];
}
