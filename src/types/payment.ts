/** Estados de un pago: los mismos de una transacción de Wompi. */
export type PaymentStatus = "pending" | "approved" | "declined" | "voided" | "error";

export interface PaymentSummary {
  status: PaymentStatus;
  reference: string;
  /** CARD, PSE, NEQUI, BANCOLOMBIA_TRANSFER… según lo que el cliente usó en Wompi. */
  paymentMethodType?: string;
  statusMessage?: string;
  approvedAt?: string;
}

/** Solicitud de reembolso de un pedido o alquiler pagado (CU-15). */
export interface RefundRequest {
  status: "abierta" | "reembolsada";
  reason: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface InvoiceRef {
  id: string;
  /** Prefijo y consecutivo, p. ej. EMV-000012. */
  number: string;
  issuedAt: string;
}

export interface PaymentStart {
  checkoutUrl: string;
  reference: string;
  expiresAt: string;
  /** Llaves de pruebas de Wompi o pasarela simulada: no se cobra dinero real. */
  sandbox: boolean;
  provider: PaymentProvider;
}

/** Wompi cuando tiene llaves; la simulada solo en desarrollo y demostraciones. */
export type PaymentProvider = "wompi" | "simulado";

/** Datos que muestra la pasarela simulada antes de aprobar o rechazar. */
export interface PaymentSimulation {
  reference: string;
  amount: number;
  status: PaymentStatus;
  target: "pedido" | "alquiler";
  description: string;
  expiresAt?: string;
}

export interface PaymentResult {
  status: PaymentStatus;
  reference: string;
  target: "pedido" | "alquiler";
  orderId?: string;
  rentalId?: string;
  paymentMethodType?: string;
  statusMessage?: string;
  invoice?: InvoiceRef;
  /** Pago aprobado que no se pudo aplicar (p. ej. el plazo ya había vencido). */
  requiresRefund: boolean;
}

export interface PaymentConfig {
  enabled: boolean;
  sandbox: boolean;
  windowMinutes: number;
  provider?: PaymentProvider | null;
}
