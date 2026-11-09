import type { PaymentStatus } from "@/types";

export const paymentStatusLabels: Record<PaymentStatus, { label: string; tone: "warning" | "info" | "success" | "danger" }> = {
  pending: { label: "En proceso", tone: "warning" },
  approved: { label: "Aprobado", tone: "success" },
  declined: { label: "Rechazado", tone: "danger" },
  voided: { label: "Anulado", tone: "danger" },
  error: { label: "Con error", tone: "danger" },
};

/** Medios de pago que reporta Wompi. Si llega uno nuevo, se muestra tal cual. */
const methodLabels: Record<string, string> = {
  CARD: "Tarjeta",
  PSE: "PSE",
  NEQUI: "Nequi",
  BANCOLOMBIA_TRANSFER: "Botón Bancolombia",
  BANCOLOMBIA_QR: "QR Bancolombia",
  BANCOLOMBIA_COLLECT: "Corresponsal Bancolombia",
  DAVIPLATA: "Daviplata",
  PCOL: "Puntos Colombia",
  SIMULADO: "Pasarela de pruebas (sin cobro real)",
  MANUAL: "Pago manual confirmado por EcoMovilidad",
};

export function paymentMethodLabel(type?: string): string {
  if (!type) return "la pasarela de pagos";
  return methodLabels[type] ?? type;
}
