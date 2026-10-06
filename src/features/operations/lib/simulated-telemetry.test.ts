import { afterEach, describe, expect, it, vi } from "vitest";
import { advanceFleet, createFleet, createRandom, createSimulatedTelemetry, distanceMeters, isInsideMetro } from "./simulated-telemetry";
import { countByStatus, type Hub, type TelemetrySnapshot } from "./telemetry";

// Coordenadas de las sucursales DEMO del seed (backend/app/db/seed_data.json).
const hubs: Hub[] = [
  { id: "cabecera", name: "Cabecera", city: "Bucaramanga", location: { lat: 7.1172, lng: -73.1095 } },
  { id: "centro", name: "Centro", city: "Bucaramanga", location: { lat: 7.119, lng: -73.124 } },
  { id: "floridablanca", name: "Cañaveral", city: "Floridablanca", location: { lat: 7.0695, lng: -73.104 } },
  { id: "giron", name: "Girón Centro", city: "Girón", location: { lat: 7.0705, lng: -73.169 } },
  { id: "piedecuesta", name: "Piedecuesta", city: "Piedecuesta", location: { lat: 6.989, lng: -73.051 } },
];
const start = new Date("2026-10-06T12:00:00Z");

describe("telemetría simulada", () => {
  afterEach(() => vi.useRealTimers());

  it("genera una flota plausible y determinista a partir de las sucursales", () => {
    const fleet = createFleet(hubs, createRandom(7), start);
    expect(fleet).toHaveLength(29);
    expect(new Set(fleet.map((a) => a.kind))).toEqual(new Set(["bicicleta", "patineta", "dron", "domicilio"]));
    const counts = countByStatus(fleet);
    expect(counts.total).toBe(29);
    expect(counts.en_uso).toBeGreaterThan(0);
    expect(counts.mantenimiento).toBeGreaterThan(0);
    expect(counts.incidencia).toBeGreaterThan(0);
    expect(new Set(fleet.map((a) => a.code)).size).toBe(29);
    expect(createFleet(hubs, createRandom(7), start).map((a) => a.position)).toEqual(fleet.map((a) => a.position));
  });

  it("mantiene todos los activos dentro del área metropolitana", () => {
    const random = createRandom(11);
    const fleet = createFleet(hubs, random, start);
    for (let tick = 0; tick < 600; tick += 1) {
      advanceFleet(fleet, hubs, random, new Date(start.getTime() + tick * 3000));
      for (const asset of fleet) expect(isInsideMetro(asset.position)).toBe(true);
    }
  });

  it("mueve los activos en uso a una velocidad acotada y cambia estados con el tiempo", () => {
    const random = createRandom(3);
    const fleet = createFleet(hubs, random, start);
    const seen = new Set<string>();
    for (let tick = 0; tick < 300; tick += 1) {
      const before = new Map(fleet.map((a) => [a.id, { ...a.position }]));
      advanceFleet(fleet, hubs, random, new Date(start.getTime() + tick * 3000));
      for (const asset of fleet) {
        seen.add(asset.status);
        // Dron, el más rápido: 12 m/s × 3 s × 10 = 360 m por tick.
        expect(distanceMeters(before.get(asset.id)!, asset.position)).toBeLessThanOrEqual(361);
      }
    }
    expect(seen).toEqual(new Set(["disponible", "en_uso", "mantenimiento", "incidencia"]));
  });

  it("se identifica como simulada y deja de emitir sin suscriptores", () => {
    vi.useFakeTimers();
    const source = createSimulatedTelemetry({ hubs, intervalMs: 3000 });
    const snapshots: TelemetrySnapshot[] = [];
    const unsubscribe = source.subscribe((s) => snapshots.push(s));
    expect(source.origin).toBe("simulada");
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].origin).toBe("simulada");
    vi.advanceTimersByTime(9000);
    expect(snapshots).toHaveLength(4);
    unsubscribe();
    vi.advanceTimersByTime(9000);
    expect(snapshots).toHaveLength(4);
    // El snapshot no expone el estado interno de la simulación.
    expect(snapshots[0].assets[0]).not.toHaveProperty("target");
    expect(snapshots[0].assets[0]).not.toHaveProperty("parking");
  });
});
