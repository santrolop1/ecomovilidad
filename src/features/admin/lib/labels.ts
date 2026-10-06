import type { OrderStatusValue, RentalStatusValue } from "@/lib/api/admin-schemas";

export const orderStatusLabels: Record<OrderStatusValue, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
};

/** Texto del botón que lleva a cada estado. */
export const orderActionLabels: Record<OrderStatusValue, string> = {
  pending: "Marcar pendiente",
  confirmed: "Confirmar pedido",
  completed: "Marcar completado",
  cancelled: "Cancelar pedido",
};

export const orderActionHints: Record<OrderStatusValue, string> = {
  pending: "",
  confirmed: "El inventario sigue reservado. Hoy la confirmación es manual: no hay pasarela de pagos.",
  completed: "Las unidades reservadas salen del inventario como vendidas. No se puede deshacer.",
  cancelled: "Las unidades reservadas vuelven a estar disponibles para la venta. No se puede deshacer.",
};

export const rentalStatusLabels: Record<RentalStatusValue, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  active: "En curso",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

export const fulfillmentLabels = { domicilio: "Domicilio", recogida: "Recogida en sucursal" } as const;
export const paymentLabels = { pse: "PSE", tarjeta: "Tarjeta", billetera: "Billetera digital" } as const;
export const serviceLabels = {
  venta: "Venta",
  alquiler: "Alquiler",
  mantenimiento: "Taller",
  recogida: "Recogida",
  devolucion: "Devoluciones",
} as const;
