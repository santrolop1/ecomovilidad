"use client";

import { divIcon } from "leaflet";
import { Marker } from "react-leaflet";
import BaseMap from "@/components/map/base-map";
import { METRO_BOUNDS, toLatLngBounds } from "@/features/branches/lib/geo";

const LIMITS = toLatLngBounds(METRO_BOUNDS, 0.3);
const icon = divIcon({
  className: "",
  html: '<span class="em-asset" data-kind="domicilio" style="--asset-color:#38bdf8"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/** Ubicación del domiciliario en el enlace de seguimiento. */
export default function TrackingMap({ lat, lng, onUnavailable }: { lat: number; lng: number; onUnavailable: () => void }) {
  const delta = 0.012;
  return (
    <BaseMap
      style="public"
      bounds={[[lat - delta, lng - delta], [lat + delta, lng + delta]]}
      maxBounds={LIMITS}
      label="Ubicación del domiciliario"
      className="h-64 rounded-2xl"
      onUnavailable={onUnavailable}
    >
      <Marker position={[lat, lng]} icon={icon} title="Domiciliario" alt="Domiciliario" />
    </BaseMap>
  );
}
