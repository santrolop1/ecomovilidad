"use client";

import type { Branch } from "@/types";
import { cn } from "@/lib/utils";
import { clusterByCity, METRO_BOUNDS, METRO_CANVAS, project } from "../lib/geo";

const { width: WIDTH, height: HEIGHT } = METRO_CANVAS;

interface ReferenceMapProps {
  branches: Branch[];
  selectedId: string | null;
  onSelect: (branchId: string) => void;
}

/**
 * Mapa esquemático (posiciones reales, sin calles) sin dependencias externas. Se muestra cuando no hay
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY o si Google Maps no carga.
 */
export function ReferenceMap({ branches, selectedId, onSelect }: ReferenceMapProps) {
  const clusters = clusterByCity(branches);

  return (
    <div className="surface-ink relative overflow-hidden rounded-3xl border border-border">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-labelledby="reference-map-title">
        <title id="reference-map-title">Mapa de referencia de los puntos de servicio en el área metropolitana de Bucaramanga</title>
        <defs>
          <pattern id="map-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="var(--ink-3)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#map-grid)" />
        {clusters.map((cluster) => {
          const { x, y } = project(cluster.location, METRO_BOUNDS, WIDTH, HEIGHT);
          const selected = selectedId !== null && cluster.branchIds.includes(selectedId);
          const labelLeft = x > WIDTH * 0.6;
          return (
            <g
              key={cluster.city}
              role="button"
              tabIndex={0}
              aria-label={`${cluster.city}: ${cluster.branchIds.length} ${cluster.branchIds.length === 1 ? "sucursal" : "sucursales"}`}
              aria-pressed={selected}
              className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-volt"
              onClick={() => onSelect(cluster.branchIds[0])}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(cluster.branchIds[0]);
                }
              }}
            >
              <circle cx={x} cy={y} r={selected ? 18 : 13} fill="var(--volt)" fillOpacity={selected ? 0.25 : 0.12} stroke="transparent" strokeWidth="2" />
              <circle cx={x} cy={y} r={selected ? 7 : 5.5} fill="var(--volt)" />
              <text
                x={labelLeft ? x - 16 : x + 16}
                y={y + 4}
                textAnchor={labelLeft ? "end" : "start"}
                className={cn("fill-paper text-[13px]", selected ? "font-semibold" : "opacity-80")}
              >
                {cluster.city}
                {cluster.branchIds.length > 1 ? ` (${cluster.branchIds.length})` : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="absolute right-4 bottom-4 left-4 rounded-xl bg-ink/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
        Vista esquemática del área metropolitana. Selecciona un municipio para ver sus sucursales.
      </p>
    </div>
  );
}
