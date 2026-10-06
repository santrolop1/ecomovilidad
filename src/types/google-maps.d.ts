/**
 * Tipos mínimos de Google Maps JavaScript API usados por el adaptador de mapa.
 * Se declaran localmente para no agregar dependencias mientras la integración
 * está en preparación.
 */
declare namespace google.maps {
  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  interface MapOptions {
    center: LatLngLiteral;
    zoom: number;
    mapId?: string;
    disableDefaultUI?: boolean;
    zoomControl?: boolean;
    gestureHandling?: "cooperative" | "greedy" | "none" | "auto";
  }

  class Map {
    constructor(element: HTMLElement, options: MapOptions);
    panTo(position: LatLngLiteral): void;
    setZoom(zoom: number): void;
  }

  interface AdvancedMarkerOptions {
    map: Map;
    position: LatLngLiteral;
    title?: string;
    gmpClickable?: boolean;
  }

  namespace marker {
    class AdvancedMarkerElement {
      constructor(options: AdvancedMarkerOptions);
      map: Map | null;
      addListener(event: "gmp-click" | "click", handler: () => void): void;
    }
  }

  function importLibrary(name: "maps"): Promise<{ Map: typeof Map }>;
  function importLibrary(name: "marker"): Promise<{ AdvancedMarkerElement: typeof marker.AdvancedMarkerElement }>;
}

interface Window {
  /** Ausente hasta que el script de Google Maps termina de cargar. */
  google?: { maps?: Partial<typeof google.maps> };
}
