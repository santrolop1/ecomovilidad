import type { InvoiceRef, PaymentSummary, RefundRequest } from "./payment";

export type PaymentMethod = "pse" | "tarjeta" | "billetera";

export type FulfillmentMethod = "domicilio" | "recogida";

/** Estados obligatorios de un domicilio (RF 5.3). */
export type DeliveryStatus =
  | "creado"
  | "asignado"
  | "en_recogida"
  | "en_transito"
  | "entregado"
  | "fallido";

/**
 * pending: unidades apartadas a la espera del pago; paid: pago aprobado por la
 * pasarela (inventario descontado y factura emitida); completed: entregado o
 * recogido. `confirmed` es histórico (confirmación manual anterior a los pagos).
 */
export type OrderStatus = "pending" | "paid" | "confirmed" | "cancelled" | "completed";

export interface CustomerInfo {
  fullName: string;
  email: string;
  phone: string;
  documentType: "CC" | "CE" | "NIT" | "PAS";
  documentNumber: string;
}

export interface FulfillmentInfo {
  method: FulfillmentMethod;
  address?: string;
  city?: string;
  branchId?: string;
  date: string; // AAAA-MM-DD
  timeSlotId: string;
}

export interface CreateOrderInput {
  items: { productId: string; quantity: number }[];
  customer: CustomerInfo;
  fulfillment: FulfillmentInfo;
  dataConsent: true;
  policyVersion?: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  total: number;
  createdAt: string;
}

export interface OrderLine {
  productId: string;
  slug: string;
  name: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/** Pedido tal como lo ve su dueño en "Mis pedidos". */
export interface DeliveryEvent {
  status: DeliveryStatus;
  note?: string;
  createdAt: string;
}

/** Domicilio visto por el dueño del pedido (CU-07, CU-08). */
export interface CustomerDelivery {
  status: DeliveryStatus;
  trackingToken: string;
  confirmationCode?: string;
  qrImage?: string;
  courierName?: string;
  deliveredAt?: string;
  failureReason?: string;
  events: DeliveryEvent[];
}

/** Seguimiento público por enlace: sin datos personales. */
export interface DeliveryTracking {
  status: DeliveryStatus;
  courierFirstName?: string;
  city?: string;
  branchName: string;
  scheduledDate: string;
  timeSlot: string;
  deliveredAt?: string;
  /** Posición del domiciliario, solo mientras va en camino y con GPS. */
  position?: { lat: number; lng: number; updatedAt: string };
  events: DeliveryEvent[];
}

export interface CustomerOrder extends Order {
  itemCount: number;
  branchName: string;
  branchCity: string;
  branchAddress: string;
  fulfillmentMethod: FulfillmentMethod;
  deliveryAddress?: string;
  deliveryCity?: string;
  scheduledDate: string;
  timeSlot: string;
  /** Histórico: medio elegido antes de los pagos en línea. */
  paymentMethod?: PaymentMethod;
  /** Plazo para pagar (solo mientras está pendiente). */
  paymentExpiresAt?: string;
  payment?: PaymentSummary;
  invoice?: InvoiceRef;
  refundRequest?: RefundRequest;
  delivery?: CustomerDelivery;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  items: OrderLine[];
  updatedAt: string;
}
