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

/** pending: creado con inventario apartado; confirmed: pago aprobado (futuro). */
export type OrderStatus = "pending" | "confirmed" | "cancelled" | "completed";

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
  paymentMethod: PaymentMethod;
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
  /** URL de pago de la pasarela (Wompi). Pendiente: pagos no integrados. */
  paymentRedirectUrl?: string;
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
  paymentMethod: PaymentMethod;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  items: OrderLine[];
  updatedAt: string;
}
