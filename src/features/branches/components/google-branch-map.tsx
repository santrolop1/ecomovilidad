"use client";

import { useEffect, useRef, useState } from "react";
import type { Branch } from "@/types";
import { loadGoogleMaps } from "../lib/load-google-maps";

interface GoogleBranchMapProps {
  apiKey: string;
  mapId: string;
  branches: Branch[];
  selectedId: string | null;
  onSelect: (branchId: string) => void;
  /** Se invoca si la API no carga; el contenedor muestra el mapa de referencia. */
  onUnavailable: () => void;
}

/** Centro del área metropolitana de Bucaramanga. */
const METRO_CENTER = { lat: 7.08, lng: -73.11 };
const SELECTED_ZOOM = 14;

/**
 * Adaptador de Google Maps Platform (RF 1.2). Solo se carga cuando existe
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. Validado contra los tipos públicos de la
 * API; requiere prueba manual con una key real (ver ESTADO.md).
 */
export default function GoogleBranchMap({ apiKey, mapId, branches, selectedId, onSelect, onUnavailable }: GoogleBranchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [ready, setReady] = useState(false);
  const onSelectRef = useRef(onSelect);
  const onUnavailableRef = useRef(onUnavailable);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onUnavailableRef.current = onUnavailable;
  }, [onSelect, onUnavailable]);

  useEffect(() => {
    let cancelled = false;
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];

    async function init() {
      try {
        await loadGoogleMaps(apiKey);
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
          google.maps.importLibrary("maps"),
          google.maps.importLibrary("marker"),
        ]);
        if (cancelled || !containerRef.current) return;

        const map = new Map(containerRef.current, {
          center: METRO_CENTER,
          zoom: 12,
          mapId,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative",
        });
        mapRef.current = map;

        for (const branch of branches) {
          const marker = new AdvancedMarkerElement({
            map,
            position: branch.location,
            title: `${branch.city}, ${branch.name}`,
            gmpClickable: true,
          });
          marker.addListener("gmp-click", () => onSelectRef.current(branch.id));
          markers.push(marker);
        }
        setReady(true);
      } catch {
        if (!cancelled) onUnavailableRef.current();
      }
    }

    void init();
    return () => {
      cancelled = true;
      for (const marker of markers) marker.map = null;
    };
  }, [apiKey, mapId, branches]);

  useEffect(() => {
    const branch = branches.find((b) => b.id === selectedId);
    if (!ready || !branch || !mapRef.current) return;
    mapRef.current.panTo(branch.location);
    mapRef.current.setZoom(SELECTED_ZOOM);
  }, [ready, selectedId, branches]);

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-border bg-muted">
      <div ref={containerRef} className="absolute inset-0" aria-label="Mapa de sucursales" role="region" />
      {!ready && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />}
    </div>
  );
}
