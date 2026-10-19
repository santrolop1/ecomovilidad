import type { OrderStatus, PaymentMethod, RentalStatus } from "@/types";

/** Estados reales del pedido, explicados al cliente sin prometer lo que no existe. */
export const customerOrderStatus: Record<OrderStatus, { label: string; tone: "warning" | "info" | "success" | "danger"; help: string }> = {
  pending: {
    label: "Pendiente de pago",
    tone: "warning",
    help: "Apartamos las unidades para ti. Págalo en línea antes de que venza el plazo; si no, se liberan.",
  },
  paid: {
    label: "Pagado",
    tone: "info",
    help: "Recibimos tu pago y emitimos la factura. Te esperamos en la fecha y franja que elegiste.",
  },
  confirmed: {
    label: "Confirmado",
    tone: "info",
    help: "EcoMovilidad confirmó tu pedido. Las unidades siguen apartadas para ti.",
  },
  completed: { label: "Completado", tone: "success", help: "El pedido se entregó o se recogió." },
  cancelled: {
    label: "Cancelado",
    tone: "danger",
    help: "El pedido se canceló (o venció sin pago) y las unidades se liberaron.",
  },
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

/** Estados reales del alquiler para el cliente. */
export const customerRentalStatus: Record<RentalStatus, { label: string; tone: "warning" | "info" | "success" | "danger"; help: string }> = {
  pending: {
    label: "Pendiente de pago",
    tone: "warning",
    help: "Apartamos una unidad para ti. Págala antes de que venza el plazo; si no, se libera.",
  },
  confirmed: { label: "Pagado", tone: "info", help: "Tu alquiler está confirmado. Recoge la unidad en la sucursal a la hora reservada." },
  active: { label: "En curso", tone: "info", help: "Tienes la unidad. Devuélvela en la misma sucursal a la hora acordada." },
  completed: { label: "Devuelto", tone: "success", help: "Recibimos la unidad. ¡Gracias por moverte con EcoMovilidad!" },
  cancelled: { label: "Cancelado", tone: "danger", help: "El alquiler se canceló (o venció sin pago) y la unidad se liberó." },
};
