/**
 * Cartografía: teselas estándar de OpenStreetMap (tile.openstreetmap.org).
 * No requieren API key; la atribución es obligatoria y el uso debe ser
 * moderado (política de uso de teselas de la OSMF). El modo oscuro se logra
 * con un filtro CSS sobre las teselas (ver globals.css, `.em-map-*`).
 */
export interface TileLayerConfig {
  url: string;
  opacity?: number;
}

export interface MapStyle {
  layers: TileLayerConfig[];
  attribution: string;
  /** Clase que aplica el tratamiento visual (filtro oscuro) a las teselas. */
  className: string;
}

const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Colaboradores de OpenStreetMap</a>';

const styles: Record<"public" | "operations", MapStyle> = {
  /** Sitio público: oscuro, con calles y nombres legibles. */
  public: { layers: [{ url: OSM_TILES }], attribution: ATTRIBUTION, className: "em-map-public" },
  /** Panel operativo: más oscuro y desaturado, para que destaquen los activos. */
  operations: { layers: [{ url: OSM_TILES }], attribution: ATTRIBUTION, className: "em-map-operations" },
};

export type MapStyleName = keyof typeof styles;

export function getMapStyle(name: MapStyleName): MapStyle {
  return styles[name];
}
