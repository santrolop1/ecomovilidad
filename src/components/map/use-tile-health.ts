"use client";

import { useEffect, useMemo, useRef } from "react";

/** Sin ninguna tesela cargada en este tiempo, el proveedor se considera caído. */
export const TILE_TIMEOUT_MS = 12_000;
export const MAX_TILE_ERRORS = 6;

/**
 * Vigila la carga de teselas (eventos de la capa, no del mapa) para mostrar el
 * fallback en lugar de un mapa vacío: muchos errores o ninguna tesela a tiempo.
 */
export function useTileHealth(onUnavailable: () => void) {
  const loaded = useRef(0);
  const errors = useRef(0);
  const reported = useRef(false);
  const report = useRef(onUnavailable);
  useEffect(() => {
    report.current = onUnavailable;
  });

  const fail = useRef(() => {
    if (reported.current || loaded.current > 0) return;
    reported.current = true;
    report.current();
  });

  useEffect(() => {
    const timer = window.setTimeout(() => fail.current(), TILE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return useMemo(
    () => ({
      tileload: () => {
        loaded.current += 1;
      },
      tileerror: () => {
        errors.current += 1;
        if (errors.current >= MAX_TILE_ERRORS) fail.current();
      },
    }),
    [],
  );
}
