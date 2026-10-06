import type { AssetKind, AssetStatus } from "./telemetry";

export const assetStatusLabels: Record<AssetStatus, string> = {
  disponible: "Disponible",
  en_uso: "En uso",
  mantenimiento: "Mantenimiento",
  incidencia: "Incidencia",
};

/** Indicadores: "17 disponibles", "1 incidencia"… */
export const assetStatusCountLabels: Record<AssetStatus, string> = {
  disponible: "Disponibles",
  en_uso: "En uso",
  mantenimiento: "En mantenimiento",
  incidencia: "Incidencias",
};

/** Mismos colores en marcadores, leyenda, indicadores y lista. */
export const assetStatusColors: Record<AssetStatus, string> = {
  disponible: "#39e58c",
  en_uso: "#38bdf8",
  mantenimiento: "#f5a524",
  incidencia: "#f43f5e",
};

export const assetKindLabels: Record<AssetKind, string> = {
  bicicleta: "Bicicleta",
  patineta: "Patineta",
  dron: "Dron",
  domicilio: "Domicilio",
};

export const assetKindPrefixes: Record<AssetKind, string> = {
  bicicleta: "BIC",
  patineta: "PAT",
  dron: "DRN",
  domicilio: "DOM",
};
