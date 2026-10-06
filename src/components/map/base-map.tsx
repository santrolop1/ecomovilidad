"use client";

import "leaflet/dist/leaflet.css";
import type { LatLngBoundsExpression, Map as LeafletMap } from "leaflet";
import type { ReactNode } from "react";
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import { cn } from "@/lib/utils";
import { getMapStyle, type MapStyleName } from "./tiles";
import { useTileHealth } from "./use-tile-health";

export interface BaseMapProps {
  style: MapStyleName;
  /** Vista inicial: el mapa se ajusta a estos límites. */
  bounds: LatLngBoundsExpression;
  /** El usuario no puede alejarse de estos límites. */
  maxBounds: LatLngBoundsExpression;
  minZoom?: number;
  label: string;
  className?: string;
  onUnavailable: () => void;
  onReady?: (map: LeafletMap) => void;
  children?: ReactNode;
}

/**
 * Mapa base de Leaflet compartido por el mapa público y el operativo. Solo se
 * importa con `next/dynamic` (Leaflet usa `window`), así que no pesa en las
 * páginas que no muestran mapas.
 */
export default function BaseMap({ style, bounds, maxBounds, minZoom = 11, label, className, onUnavailable, onReady, children }: BaseMapProps) {
  const { layers, attribution, className: styleClass } = getMapStyle(style);
  const tileEvents = useTileHealth(onUnavailable);
  return (
    <div role="region" aria-label={label} className="size-full">
    <MapContainer
      bounds={bounds}
      maxBounds={maxBounds}
      maxBoundsViscosity={0.8}
      minZoom={minZoom}
      maxZoom={18}
      scrollWheelZoom={false}
      zoomSnap={0.5}
      attributionControl
      zoomControl={false}
      ref={(map) => {
        if (map) onReady?.(map);
      }}
      className={cn("em-map size-full", styleClass, className)}
    >
      {layers.map((layer, index) => (
        <TileLayer
          key={layer.url}
          url={layer.url}
          opacity={layer.opacity ?? 1}
          attribution={index === 0 ? attribution : undefined}
          eventHandlers={index === 0 ? tileEvents : undefined}
        />
      ))}
      <ZoomControl position="topright" />
      {children}
    </MapContainer>
    </div>
  );
}
