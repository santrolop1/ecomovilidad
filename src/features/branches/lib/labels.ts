import type { BranchServiceKind } from "@/types";

export const branchServiceLabels: Record<BranchServiceKind, string> = {
  venta: "Venta",
  alquiler: "Alquiler",
  mantenimiento: "Taller",
  recogida: "Recogida",
  devolucion: "Devoluciones",
};

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

export function formatUpdatedAt(iso: string): string {
  return timeFormatter.format(new Date(iso));
}
