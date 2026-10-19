import type { OrderStatusValue, RentalStatusValue, RentalUnitStatusValue } from "@/lib/api/admin-schemas";

export const orderStatusLabels: Record<OrderStatusValue, string> = {
  pending: "Pendiente de pago",
  paid: "Pagado",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
};

/** Texto del botón que lleva a cada estado. */
export const orderActionLabels: Record<OrderStatusValue, string> = {
  pending: "Marcar pendiente",
  paid: "Marcar pagado",
  confirmed: "Confirmar pedido",
  completed: "Marcar entregado",
  cancelled: "Cancelar pedido",
};

export const orderActionHints: Record<OrderStatusValue, string> = {
  pending: "",
  paid: "Solo lo marca la pasarela al aprobar el pago.",
  confirmed: "Pedido anterior a los pagos en línea: el inventario sigue reservado.",
  completed:
    "El cliente recibió o recogió el pedido. Si estaba pagado, el inventario ya se descontó al pagar; si no, sale ahora. No se puede deshacer.",
  cancelled: "Las unidades reservadas vuelven a estar disponibles para la venta. No se puede deshacer.",
};

export const rentalStatusLabels: Record<RentalStatusValue, string> = {
  pending: "Pendiente de pago",
  confirmed: "Pagado",
  active: "Entregado",
  completed: "Devuelto",
  cancelled: "Cancelado",
};

export const rentalActionLabels: Record<RentalStatusValue, string> = {
  pending: "Marcar pendiente",
  confirmed: "Marcar pagado",
  active: "Entregar al cliente",
  completed: "Recibir devolución",
  cancelled: "Cancelar alquiler",
};

export const rentalActionHints: Record<RentalStatusValue, string> = {
  pending: "",
  confirmed: "Solo lo marca la pasarela al aprobar el pago.",
  active: "El cliente se lleva la unidad. No se puede deshacer.",
  completed: "La unidad volvió a la sucursal y queda libre para otros alquileres. No se puede deshacer.",
  cancelled: "Libera la unidad apartada. Solo para alquileres sin pagar. No se puede deshacer.",
};

export const rentalUnitStatusLabels: Record<RentalUnitStatusValue, string> = {
  operativo: "Operativa",
  mantenimiento: "En mantenimiento",
  retirado: "Retirada",
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
