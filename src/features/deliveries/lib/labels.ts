import type { DeliveryStatus } from "@/types";

export const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  creado: "Por asignar",
  asignado: "Domiciliario asignado",
  en_recogida: "En recogida",
  en_transito: "En camino",
  entregado: "Entregado",
  fallido: "No se pudo entregar",
};

export const deliveryStatusTone: Record<DeliveryStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  creado: "warning",
  asignado: "info",
  en_recogida: "info",
  en_transito: "info",
  entregado: "success",
  fallido: "danger",
};

/** Avance normal de un domicilio (RF 5.3). */
export const deliverySteps: DeliveryStatus[] = ["creado", "asignado", "en_recogida", "en_transito", "entregado"];

export const deliveryNextLabels: Partial<Record<DeliveryStatus, string>> = {
  en_recogida: "Marcar en recogida",
  en_transito: "Marcar en camino",
  creado: "Reprogramar",
};
