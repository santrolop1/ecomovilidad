import type { OrderStatus, PaymentMethod } from "@/types";

/** Estados reales del pedido, explicados al cliente sin prometer lo que no existe. */
export const customerOrderStatus: Record<OrderStatus, { label: string; tone: "warning" | "info" | "success" | "danger"; help: string }> = {
  pending: {
    label: "Pendiente de confirmación",
    tone: "warning",
    help: "Recibimos tu pedido y apartamos las unidades. EcoMovilidad lo confirmará; el pago en línea aún no está disponible.",
  },
  confirmed: {
    label: "Confirmado",
    tone: "info",
    help: "EcoMovilidad confirmó tu pedido. Las unidades siguen apartadas para ti.",
  },
  completed: { label: "Completado", tone: "success", help: "El pedido se entregó o se recogió." },
  cancelled: { label: "Cancelado", tone: "danger", help: "El pedido se canceló y las unidades se liberaron." },
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  pse: "PSE",
  tarjeta: "Tarjeta de crédito o débito",
  billetera: "Billetera digital",
};

export const timeSlotLabels: Record<string, string> = {
  "slot-08": "8:00 a. m. – 10:00 a. m.",
  "slot-10": "10:00 a. m. – 12:00 m.",
  "slot-12": "12:00 m. – 2:00 p. m.",
  "slot-14": "2:00 p. m. – 4:00 p. m.",
  "slot-16": "4:00 p. m. – 6:00 p. m.",
};
