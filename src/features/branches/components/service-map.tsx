"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { MapBoundary } from "@/components/map/map-boundary";
import { useNearViewport } from "@/components/map/use-near-viewport";
import { cn } from "@/lib/utils";
import type { Branch } from "@/types";
import { BranchMapFallback } from "./branch-map-fallback";

const loading = () => <div className="size-full animate-pulse bg-ink-2" aria-hidden="true" />;

// Leaflet y Google Maps solo se descargan en el cliente y cuando el mapa se va a ver.
const BranchMap = dynamic(() => import("./branch-map"), { ssr: false, loading });
const GoogleBranchMap = dynamic(() => import("./google-branch-map"), { ssr: false, loading });

export interface MapConfig {
  apiKey?: string;
  mapId: string;
}

interface ServiceMapProps {
  /** Google Maps solo se usa si hay una API key configurada; si no, OpenStreetMap. */
  config?: MapConfig;
  branches: Branch[];
  selectedId?: string | null;
  onSelect?: (branchId: string) => void;
  detailsHref?: (branch: Branch) => string;
  className?: string;
}

const defaultHref = (branch: Branch) => `/sucursales#${branch.slug}`;

/** Mapa público de sucursales: elige proveedor y degrada a una lista si el mapa no carga. */
export function ServiceMap({ config, branches, selectedId = null, onSelect = () => {}, detailsHref = defaultHref, className }: ServiceMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const visible = useNearViewport(container);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const fallback = <BranchMapFallback branches={branches} detailsHref={detailsHref} />;

  if (unavailable) return fallback;

  const useGoogle = Boolean(config?.apiKey) && !googleUnavailable;
  return (
    <div ref={container} className={cn("surface-ink relative isolate aspect-[4/5] overflow-hidden rounded-3xl border border-border", className)}>
      {visible && (
        <MapBoundary fallback={fallback}>
          {useGoogle && config?.apiKey ? (
            <GoogleBranchMap
              apiKey={config.apiKey}
              mapId={config.mapId}
              branches={branches}
              selectedId={selectedId}
              onSelect={onSelect}
              onUnavailable={() => setGoogleUnavailable(true)}
            />
          ) : (
            <BranchMap
              branches={branches}
              selectedId={selectedId}
              onSelect={onSelect}
              detailsHref={detailsHref}
              onUnavailable={() => setUnavailable(true)}
            />
          )}
        </MapBoundary>
      )}
      <p className="pointer-events-none absolute top-3 left-3 z-[500] max-w-[calc(100%-4.5rem)] rounded-xl bg-ink/85 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
        Cobertura: Bucaramanga, Floridablanca, Girón y Piedecuesta
      </p>
    </div>
  );
}
