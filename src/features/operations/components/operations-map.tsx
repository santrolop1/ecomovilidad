"use client";

import { divIcon, type DivIcon, type Map as LeafletMap } from "leaflet";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Marker, Polyline, ScaleControl, Tooltip } from "react-leaflet";
import BaseMap from "@/components/map/base-map";
import { METRO_BOUNDS, toLatLngBounds } from "@/features/branches/lib/geo";
import { assetKindLabels, assetStatusColors, assetStatusLabels } from "../lib/labels";
import type { AssetKind, AssetStatus, FleetAsset, Hub } from "../lib/telemetry";

// Vista inicial: las sucursales (bases) con margen, para aprovechar el área útil del mapa.
function hubsView(hubs: Hub[]) {
  if (hubs.length === 0) return toLatLngBounds(METRO_BOUNDS);
  const lats = hubs.map((hub) => hub.location.lat);
  const lngs = hubs.map((hub) => hub.location.lng);
  return toLatLngBounds({ minLat: Math.min(...lats), maxLat: Math.max(...lats), minLng: Math.min(...lngs), maxLng: Math.max(...lngs) }, 0.025);
}
const LIMITS = toLatLngBounds(METRO_BOUNDS, 0.3);

// Un icono por combinación: Leaflet no recrea el DOM del marcador si el icono no cambia.
const iconCache = new Map<string, DivIcon>();
function assetIcon(kind: AssetKind, status: AssetStatus, selected: boolean): DivIcon {
  const key = `${kind}-${status}-${selected}`;
  let icon = iconCache.get(key);
  if (!icon) {
    icon = divIcon({
      className: "",
      html: `<span class="em-asset" data-kind="${kind}" data-selected="${selected}" style="--asset-color:${assetStatusColors[status]}"></span>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const hubIcon = (hub: Hub) =>
  divIcon({ className: "", html: `<span class="em-hub">${escapeHtml(hub.name)}</span>`, iconSize: [0, 0], iconAnchor: [6, 6] });

export interface OperationsMapProps {
  hubs: Hub[];
  assets: FleetAsset[];
  selectedId: string | null;
  onSelect: (assetId: string) => void;
  onUnavailable: () => void;
}

/** Mapa operativo: sucursales reales como bases y activos de la telemetría (hoy simulada). */
export default function OperationsMap({ hubs, assets, selectedId, onSelect, onUnavailable }: OperationsMapProps) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const selected = assets.find((asset) => asset.id === selectedId);
  const hubIcons = useMemo(() => new Map(hubs.map((hub) => [hub.id, hubIcon(hub)])), [hubs]);
  const view = useMemo(() => hubsView(hubs), [hubs]);

  // Centrar solo al cambiar la selección, no en cada actualización de posición.
  useEffect(() => {
    if (!map || !selected) return;
    map.panTo([selected.position.lat, selected.position.lng], { animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedId]);

  return (
    <BaseMap
      style="operations"
      bounds={view}
      maxBounds={LIMITS}
      label="Mapa operativo de la flota (posiciones simuladas)"
      onUnavailable={onUnavailable}
      onReady={setMap}
    >
      {hubs.map((hub) => (
        <Marker key={hub.id} position={[hub.location.lat, hub.location.lng]} icon={hubIcons.get(hub.id)} interactive={false} keyboard={false} />
      ))}
      <ScaleControl position="bottomright" imperial={false} />
      {assets.map((asset) => {
        const color = assetStatusColors[asset.status];
        return (
          <Fragment key={asset.id}>
            {asset.trail.length > 0 && (
              <Polyline
                positions={[...asset.trail, asset.position].map((p) => [p.lat, p.lng] as [number, number])}
                pathOptions={{ color, weight: 2, opacity: 0.55 }}
                interactive={false}
              />
            )}
            {asset.destination && (
              <Polyline
                positions={[
                  [asset.position.lat, asset.position.lng],
                  [asset.destination.lat, asset.destination.lng],
                ]}
                pathOptions={{ color, weight: 1.5, opacity: 0.7, dashArray: "4 6" }}
                interactive={false}
              />
            )}
            <Marker
              position={[asset.position.lat, asset.position.lng]}
              icon={assetIcon(asset.kind, asset.status, asset.id === selectedId)}
              zIndexOffset={asset.id === selectedId ? 1000 : 0}
              title={`${asset.code}: ${assetKindLabels[asset.kind]}, ${assetStatusLabels[asset.status]}`}
              alt={`${asset.code}: ${assetKindLabels[asset.kind]}, ${assetStatusLabels[asset.status]}`}
              eventHandlers={{ click: () => onSelect(asset.id) }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                {asset.code}
              </Tooltip>
            </Marker>
          </Fragment>
        );
      })}
    </BaseMap>
  );
}
