import { METRO_BOUNDS } from "@/features/branches/lib/geo";
import type { GeoPoint } from "@/types";
import { assetKindPrefixes } from "./labels";
import type { AssetKind, AssetStatus, FleetAsset, Hub, TelemetrySnapshot, TelemetrySource } from "./telemetry";

/**
 * Telemetría SIMULADA para el MODO DEMOSTRACIÓN del mapa operativo.
 *
 * - Parte de las sucursales reales (coordenadas de la base de datos) y genera
 *   una flota plausible alrededor de cada una. Ninguna posición es GPS real.
 * - Es determinista (semilla fija): la misma flota en cada carga.
 * - El tiempo va acelerado (TIME_SCALE) para que el movimiento se vea a escala
 *   metropolitana con una actualización cada 3 s.
 * - Todo ocurre en el navegador: no escribe en la base de datos ni se mezcla
 *   con datos reales.
 */
export const SIMULATION_INTERVAL_MS = 3_000;
export const TIME_SCALE = 10;
const TRAIL_LENGTH = 8;

/** Velocidad típica en m/s; por tick se recorre velocidad × intervalo × TIME_SCALE. */
const SPEED_MPS: Record<AssetKind, number> = { bicicleta: 5, patineta: 6, dron: 12, domicilio: 8 };
const BATTERY_DRAIN: Record<AssetKind, number> = { bicicleta: 0.4, patineta: 0.6, dron: 1.5, domicilio: 0.5 };

/** Probabilidades por tick. */
const P_START_TRIP = 0.05;
const P_INCIDENT = 0.004;
const P_INCIDENT_TO_MAINTENANCE = 0.05;
const P_MAINTENANCE_DONE = 0.03;

export type Random = () => number;

/** PRNG pequeño y determinista (mulberry32). */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const METERS_PER_DEGREE = 111_320;

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = (b.lat - a.lat) * METERS_PER_DEGREE;
  const dLng = (b.lng - a.lng) * METERS_PER_DEGREE * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

/** Margen para que ningún activo quede en el borde del área metropolitana. */
const INNER = { minLat: METRO_BOUNDS.minLat + 0.01, maxLat: METRO_BOUNDS.maxLat - 0.01, minLng: METRO_BOUNDS.minLng + 0.01, maxLng: METRO_BOUNDS.maxLng - 0.01 };

export function isInsideMetro(point: GeoPoint): boolean {
  return point.lat >= METRO_BOUNDS.minLat && point.lat <= METRO_BOUNDS.maxLat && point.lng >= METRO_BOUNDS.minLng && point.lng <= METRO_BOUNDS.maxLng;
}

function clampToMetro(point: GeoPoint): GeoPoint {
  return {
    lat: Math.min(INNER.maxLat, Math.max(INNER.minLat, point.lat)),
    lng: Math.min(INNER.maxLng, Math.max(INNER.minLng, point.lng)),
  };
}

function randomNear(center: GeoPoint, minMeters: number, maxMeters: number, random: Random): GeoPoint {
  const angle = random() * 2 * Math.PI;
  const radius = minMeters + random() * (maxMeters - minMeters);
  return clampToMetro({
    lat: center.lat + (Math.sin(angle) * radius) / METERS_PER_DEGREE,
    lng: center.lng + (Math.cos(angle) * radius) / (METERS_PER_DEGREE * Math.cos((center.lat * Math.PI) / 180)),
  });
}

function moveToward(from: GeoPoint, to: GeoPoint, meters: number): GeoPoint {
  const distance = distanceMeters(from, to);
  if (distance <= meters) return { ...to };
  const ratio = meters / distance;
  return { lat: from.lat + (to.lat - from.lat) * ratio, lng: from.lng + (to.lng - from.lng) * ratio };
}

/** Estado interno: el destino del viaje no forma parte del contrato público. */
export interface SimulatedAsset extends FleetAsset {
  target?: GeoPoint;
  returning: boolean;
  /** Puesto fijo junto a su sucursal, adonde vuelve al terminar cada viaje. */
  parking: GeoPoint;
}

/** Composición por sucursal: 2 bicicletas, 2 patinetas y 1 domicilio; 4 drones repartidos. */
const PER_HUB: AssetKind[] = ["bicicleta", "bicicleta", "patineta", "patineta", "domicilio"];
const DRONES = 4;
/** Reparto inicial de estados (se baraja con la semilla). */
const INITIAL_SHARE: [AssetStatus, number][] = [
  ["en_uso", 0.28],
  ["mantenimiento", 0.1],
  ["incidencia", 0.04],
];

export function createFleet(hubs: Hub[], random: Random, now: Date): SimulatedAsset[] {
  if (hubs.length === 0) return [];
  const ordered = [...hubs].sort((a, b) => a.name.localeCompare(b.name));
  const plan: { kind: AssetKind; hub: Hub }[] = ordered.flatMap((hub) => PER_HUB.map((kind) => ({ kind, hub })));
  for (let i = 0; i < DRONES; i += 1) plan.push({ kind: "dron", hub: ordered[i % ordered.length] });

  const statuses: AssetStatus[] = plan.map(() => "disponible");
  let cursor = 0;
  for (const [status, share] of INITIAL_SHARE) {
    const count = Math.max(1, Math.round(plan.length * share));
    for (let i = 0; i < count && cursor < statuses.length; i += 1) statuses[cursor++] = status;
  }
  for (let i = statuses.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
  }

  const numbers: Record<AssetKind, number> = { bicicleta: 0, patineta: 0, dron: 0, domicilio: 0 };
  const at = now.toISOString();
  return plan.map(({ kind, hub }, index) => {
    numbers[kind] += 1;
    const status = statuses[index];
    const parking = randomNear(hub.location, 10, 120, random);
    const asset: SimulatedAsset = {
      id: `sim-${kind}-${numbers[kind]}`,
      code: `${assetKindPrefixes[kind]}-${String(numbers[kind]).padStart(2, "0")}`,
      kind,
      status,
      position: { ...parking },
      parking,
      trail: [],
      batteryPct: Math.round(45 + random() * 55),
      hubId: hub.id,
      updatedAt: at,
      returning: false,
    };
    if (status === "en_uso") startTrip(asset, hub, random, true);
    if (status === "incidencia") asset.position = randomNear(hub.location, 600, 2500, random);
    return asset;
  });
}

function startTrip(asset: SimulatedAsset, hub: Hub, random: Random, midway = false) {
  asset.status = "en_uso";
  asset.returning = false;
  asset.target = randomNear(hub.location, 1200, asset.kind === "dron" ? 2500 : 4000, random);
  if (asset.kind === "domicilio") asset.destination = asset.target;
  if (midway) asset.position = moveToward(asset.parking, asset.target, distanceMeters(asset.parking, asset.target) * random());
}

function finishTrip(asset: SimulatedAsset) {
  asset.status = "disponible";
  asset.target = undefined;
  asset.destination = undefined;
  asset.returning = false;
  asset.trail = [];
}

/** Avanza la simulación un tick. Muta y devuelve la misma flota. */
export function advanceFleet(fleet: SimulatedAsset[], hubs: Hub[], random: Random, now: Date): SimulatedAsset[] {
  const byId = new Map(hubs.map((hub) => [hub.id, hub]));
  const at = now.toISOString();
  for (const asset of fleet) {
    const hub = byId.get(asset.hubId);
    if (!hub) continue;
    const step = SPEED_MPS[asset.kind] * (SIMULATION_INTERVAL_MS / 1000) * TIME_SCALE;
    const before = asset.position;

    switch (asset.status) {
      case "disponible":
        asset.batteryPct = Math.min(100, asset.batteryPct + 1);
        if (asset.batteryPct > 30 && random() < P_START_TRIP) startTrip(asset, hub, random);
        break;
      case "en_uso": {
        asset.batteryPct = Math.max(0, asset.batteryPct - BATTERY_DRAIN[asset.kind]);
        if (random() < P_INCIDENT) {
          asset.status = "incidencia";
          asset.target = undefined;
          asset.destination = undefined;
          break;
        }
        if (asset.batteryPct < 15) asset.returning = true;
        const goal = asset.returning || !asset.target ? asset.parking : asset.target;
        asset.position = moveToward(asset.position, goal, step);
        if (distanceMeters(asset.position, goal) < 1) {
          if (asset.returning || !asset.target) {
            finishTrip(asset);
          } else {
            asset.returning = true;
            asset.destination = undefined;
          }
        }
        break;
      }
      case "incidencia":
        if (random() < P_INCIDENT_TO_MAINTENANCE) asset.status = "mantenimiento";
        break;
      case "mantenimiento":
        // Traslado al taller de su sucursal y reparación.
        if (distanceMeters(asset.position, asset.parking) > 1) {
          asset.position = moveToward(asset.position, asset.parking, step);
        } else {
          asset.batteryPct = Math.min(100, asset.batteryPct + 2);
          if (random() < P_MAINTENANCE_DONE) {
            finishTrip(asset);
            asset.batteryPct = 100;
          }
        }
        break;
    }

    if (asset.position !== before && distanceMeters(before, asset.position) > 0) {
      asset.trail = [...asset.trail, before].slice(-TRAIL_LENGTH);
      asset.updatedAt = at;
    } else if (asset.status !== "en_uso") {
      asset.trail = [];
    }
  }
  return fleet;
}

function toSnapshot(fleet: SimulatedAsset[], now: Date): TelemetrySnapshot {
  return {
    at: now.toISOString(),
    origin: "simulada",
    // Solo los campos del contrato: el estado interno (destino, puesto) no sale de aquí.
    assets: fleet.map(
      (asset): FleetAsset => ({
        id: asset.id,
        code: asset.code,
        kind: asset.kind,
        status: asset.status,
        position: { ...asset.position },
        trail: [...asset.trail],
        batteryPct: asset.batteryPct,
        hubId: asset.hubId,
        ...(asset.destination ? { destination: { ...asset.destination } } : {}),
        updatedAt: asset.updatedAt,
      }),
    ),
  };
}

interface SimulationOptions {
  hubs: Hub[];
  seed?: number;
  intervalMs?: number;
  now?: () => Date;
}

/** Fuente de telemetría simulada. Se pausa sola cuando no hay suscriptores. */
export function createSimulatedTelemetry({ hubs, seed = 20261006, intervalMs = SIMULATION_INTERVAL_MS, now = () => new Date() }: SimulationOptions): TelemetrySource {
  const random = createRandom(seed);
  const fleet = createFleet(hubs, random, now());
  const listeners = new Set<(snapshot: TelemetrySnapshot) => void>();
  let timer: ReturnType<typeof setInterval> | undefined;

  function tick() {
    const current = now();
    advanceFleet(fleet, hubs, random, current);
    const snapshot = toSnapshot(fleet, current);
    for (const listener of listeners) listener(snapshot);
  }

  return {
    origin: "simulada",
    intervalMs,
    subscribe(listener) {
      listeners.add(listener);
      listener(toSnapshot(fleet, now()));
      timer ??= setInterval(tick, intervalMs);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer) {
          clearInterval(timer);
          timer = undefined;
        }
      };
    },
  };
}
