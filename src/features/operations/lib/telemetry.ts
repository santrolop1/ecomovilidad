import type { GeoPoint } from "@/types";

/**
 * Contrato de telemetría del mapa operativo.
 *
 * Hoy la única implementación es `createSimulatedTelemetry` (simulación en el
 * navegador, MODO DEMOSTRACIÓN). Cuando exista telemetría GPS real bastará con
 * otra implementación de `TelemetrySource` (p. ej. WebSocket o SSE desde
 * FastAPI) que emita los mismos `TelemetrySnapshot` con `origin: "gps"`; la
 * interfaz del panel no cambia.
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
  batteryPct: number;
  hubId: string;
  /** Domicilios: punto de entrega. */
  destination?: GeoPoint;
  updatedAt: string;
}

export interface TelemetrySnapshot {
  assets: FleetAsset[];
  at: string;
  /** "simulada" mientras no exista telemetría física. */
  origin: "simulada" | "gps";
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
