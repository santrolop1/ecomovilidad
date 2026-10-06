"use client";

import { divIcon, type Map as LeafletMap, type Marker as LeafletMarker } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import BaseMap from "@/components/map/base-map";
import { categoryLabels } from "@/features/catalog/lib/labels";
import type { Branch } from "@/types";
import { availableUnits, METRO_BOUNDS, toLatLngBounds } from "../lib/geo";

const VIEW = toLatLngBounds(METRO_BOUNDS);
// Margen amplio: el autoPan de los popups no debe chocar con el límite; aun así no se sale de la región.
const LIMITS = toLatLngBounds(METRO_BOUNDS, 0.3);

const pinIcon = (selected: boolean) =>
  divIcon({
    className: "",
    html: `<span class="em-pin${selected ? " em-pin-selected" : ""}"><span class="em-pin-dot"></span></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
const ICONS = { idle: pinIcon(false), selected: pinIcon(true) };

export interface BranchMapProps {
  branches: Branch[];
  selectedId?: string | null;
  onSelect?: (branchId: string) => void;
  /** Destino del enlace "Ver horarios" del popup. */
  detailsHref?: (branch: Branch) => string;
  onUnavailable: () => void;
}

function BranchPopup({ branch, detailsHref }: { branch: Branch; detailsHref: (branch: Branch) => string }) {
  const total = availableUnits(branch);
  const { lat, lng } = branch.location;
  return (
    <div className="space-y-3">
      <div>
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {branch.city}
          {branch.isDemo && <span className="rounded-full bg-warning/20 px-1.5 py-px text-[0.7rem] text-amber-300">Dato de demostración</span>}
        </p>
        <p className="font-display-tight mt-0.5 text-base">{branch.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {branch.address}, {branch.neighborhood}
        </p>
      </div>
      <div>
        <p className="text-sm">
          <span className="tabular font-semibold text-volt">{total}</span> unidades disponibles
        </p>
        <ul className="mt-1.5 flex flex-wrap gap-1">
          {branch.inventory.map((entry) => (
            <li key={entry.category} className="tabular rounded-full bg-ink-3 px-2 py-0.5 text-xs">
              {categoryLabels[entry.category]} {entry.available}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
        <a href={detailsHref(branch)} className="text-volt hover:underline">
          Ver horarios
        </a>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="em-link-secondary hover:underline"
        >
          Cómo llegar
        </a>
      </div>
    </div>
  );
}

/**
 * Mapa público de sucursales sobre OpenStreetMap. Las posiciones son las
 * coordenadas de cada sucursal en la base de datos; la disponibilidad viene
 * del inventario real (GET /branches).
 */
export default function BranchMap({ branches, selectedId = null, onSelect, detailsHref = (b) => `/sucursales#${b.slug}`, onUnavailable }: BranchMapProps) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const markers = useRef(new Map<string, LeafletMarker>());
  // Solo se renderiza en el cliente (ssr: false): window existe.
  const [popupWidth] = useState(() => Math.min(280, window.innerWidth - 96));

  // Selección hecha en el propio mapa: el popup ya está abierto y encuadrado.
  const clickedId = useRef<string | null>(null);

  // Selección desde la lista: centrar la sucursal y, al terminar el movimiento,
  // abrir su popup (así su autoPan lo deja visible).
  useEffect(() => {
    if (!map || !selectedId) return;
    if (clickedId.current === selectedId) {
      clickedId.current = null;
      return;
    }
    const branch = branches.find((b) => b.id === selectedId);
    if (!branch) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target: [number, number] = [branch.location.lat, branch.location.lng];
    const zoom = Math.max(map.getZoom(), 14);
    const open = () => markers.current.get(branch.id)?.openPopup();
    map.once("moveend", open);
    if (reduceMotion) map.setView(target, zoom, { animate: false });
    else map.flyTo(target, zoom, { duration: 0.6 });
    return () => {
      map.off("moveend", open);
    };
  }, [map, selectedId, branches]);

  return (
    <BaseMap
      style="public"
      bounds={VIEW}
      maxBounds={LIMITS}
      label="Mapa de sucursales de EcoMovilidad en el área metropolitana de Bucaramanga"
      onUnavailable={onUnavailable}
      onReady={setMap}
    >
      {branches.map((branch) => (
        <Marker
          key={branch.id}
          position={[branch.location.lat, branch.location.lng]}
          icon={branch.id === selectedId ? ICONS.selected : ICONS.idle}
          title={`${branch.name}, ${branch.city}`}
          alt={`${branch.name}, ${branch.city}`}
          keyboard
          ref={(marker) => {
            if (marker) markers.current.set(branch.id, marker);
            else markers.current.delete(branch.id);
          }}
          eventHandlers={{
            click: () => {
              clickedId.current = branch.id;
              onSelect?.(branch.id);
            },
          }}
        >
          {/* Margen superior al encuadrar el popup: no queda bajo el rótulo de cobertura ni el zoom. */}
          <Popup maxWidth={popupWidth} minWidth={Math.min(220, popupWidth)} autoPanPaddingTopLeft={[16, 104]} autoPanPaddingBottomRight={[16, 16]} className="em-popup">
            <BranchPopup branch={branch} detailsHref={detailsHref} />
          </Popup>
        </Marker>
      ))}
    </BaseMap>
  );
}
