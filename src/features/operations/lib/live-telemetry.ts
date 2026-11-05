import { fleetSnapshotSchema } from "@/lib/api/admin-schemas";
import type { TelemetrySnapshot, TelemetrySource } from "./telemetry";

export const LIVE_INTERVAL_MS = 3_000;

/**
 * Telemetría real (CU-10): consulta la flota cada 3 s por el BFF del panel. Si
 * una consulta falla, el mapa conserva lo último recibido y lo intenta de nuevo.
 */
export function createLiveTelemetry(intervalMs = LIVE_INTERVAL_MS): TelemetrySource {
  return {
    origin: "gps",
    intervalMs,
    subscribe(listener) {
      let active = true;
      async function load() {
        try {
          const response = await fetch("/api/admin/telemetria", { cache: "no-store" });
          if (!response.ok) return;
          const fleet = fleetSnapshotSchema.parse(await response.json());
          if (!active) return;
          const snapshot: TelemetrySnapshot = {
            origin: "gps",
            at: fleet.at,
            openAlerts: fleet.openAlerts,
            zones: fleet.zones,
            assets: fleet.assets,
          };
          listener(snapshot);
        } catch {
          // Sin conexión: se reintenta en el siguiente ciclo.
        }
      }
      void load();
      const timer = setInterval(load, intervalMs);
      return () => {
        active = false;
        clearInterval(timer);
      };
    },
  };
}
