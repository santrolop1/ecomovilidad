import type { GeoPoint } from "@/types";

/**
 * Contrato de telemetría del mapa operativo.
 *
 * Dos implementaciones: `createLiveTelemetry` lee las posiciones reales que los
 * dispositivos envían por API (`origin: "gps"`), y `createSimulatedTelemetry`
 * simula la flota en el navegador (MODO DEMOSTRACIÓN) mientras no haya
 * dispositivos registrados.
 */
export type AssetKind = "bicicleta" | "patineta" | "dron" | "domicilio";
export type AssetStatus = "disponible" | "en_uso" | "mantenimiento" | "incidencia";

export const assetKinds: AssetKind[] = ["bicicleta", "patineta", "dron", "domicilio"];
export const assetStatuses: AssetStatus[] = ["disponible", "en_uso", "mantenimiento", "incidencia"];

/** Sucursal real (base de datos) que sirve de base a los activos. */
export interface Hub {
  id: string;
  name: string;
  city: string;
  location: GeoPoint;
}

export interface FleetAsset {
  id: string;
  /** Identificador visible, p. ej. "BIC-02". */
  code: string;
  kind: AssetKind;
  status: AssetStatus;
  position: GeoPoint;
  /** Últimas posiciones (más antigua primero) para dibujar el recorrido. */
  trail: GeoPoint[];
  batteryPct: number | null;
  hubId: string | null;
  /** Sin reportar hace más de 5 minutos. */
  stale?: boolean;
  /** Domicilios: punto de entrega. */
  destination?: GeoPoint;
  updatedAt: string;
}

export interface Zone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusM: number;
}

export interface TelemetrySnapshot {
  assets: FleetAsset[];
  at: string;
  /** "simulada" mientras no haya dispositivos GPS registrados. */
  origin: "simulada" | "gps";
  zones?: Zone[];
  openAlerts?: number;
}

export interface TelemetrySource {
  readonly origin: TelemetrySnapshot["origin"];
  readonly intervalMs: number;
  /** Emite un snapshot inmediatamente y después en cada actualización. Devuelve la función para cancelar. */
  subscribe(listener: (snapshot: TelemetrySnapshot) => void): () => void;
}

export type StatusCounts = Record<AssetStatus, number> & { total: number };

export function countByStatus(assets: FleetAsset[]): StatusCounts {
  const counts: StatusCounts = { total: assets.length, disponible: 0, en_uso: 0, mantenimiento: 0, incidencia: 0 };
  for (const asset of assets) counts[asset.status] += 1;
  return counts;
}
