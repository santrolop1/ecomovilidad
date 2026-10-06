"use client";

import { useEffect, useState } from "react";
import type { TelemetrySnapshot, TelemetrySource } from "./telemetry";

/** Último snapshot de una fuente de telemetría; `paused` cancela la suscripción. */
export function useTelemetry(source: TelemetrySource, paused = false): TelemetrySnapshot | null {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot | null>(null);
  useEffect(() => {
    if (paused) return;
    return source.subscribe(setSnapshot);
  }, [source, paused]);
  return snapshot;
}
