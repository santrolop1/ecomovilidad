import type { ImageAsset, ProductCategorySlug } from "./catalog";
import type { CustomerInfo } from "./order";
import type { InvoiceRef, PaymentSummary } from "./payment";

export type RentalDurationUnit = "hora" | "dia" | "semana";

export interface RentalRate {
  unit: RentalDurationUnit;
  /** Precio en COP por unidad de tiempo. */
  price: number;
}

/**
 * Estado de mantenimiento del activo (Módulo 3). Al alcanzar el 90% del
 * umbral, el activo pasa a "requires_review" y se oculta del catálogo (RF 3.2).
 */
export type MaintenanceStatus = "operational" | "requires_review" | "in_maintenance";

export interface MaintenanceInfo {
  status: MaintenanceStatus;
  /** Uso acumulado respecto al umbral configurado (0–1). */
  thresholdUsage: number;
  /** Kilómetros para vehículos terrestres, horas de vuelo para drones (RF 3.1). */
  thresholdUnit: "km" | "horas_vuelo";
}

export interface RentalBranchAvailability {
  branchId: string;
  available: number;
}

export interface RentalVehicle {
  id: string;
  slug: string;
  name: string;
  category: ProductCategorySlug;
  description: string;
  image: ImageAsset;
  rates: RentalRate[];
  features: string[];
  availability: RentalBranchAvailability[];
  maintenance: MaintenanceInfo;
  /** Requisitos o restricciones de uso (p. ej. normativa AEROCIVIL para drones). */
  requirements?: string[];
}

/** Franja horaria de entrega/recogida (RF 7.1). */
export interface TimeSlot {
  id: string;
  label: string; // "8:00 a. m. – 10:00 a. m."
  start: string; // "08:00"
  end: string; // "10:00"
  available: boolean;
}

/** Vehículo que se alquila, con tarifas reales y unidades en servicio por sucursal. */
export interface RentalOffer {
  productId: string;
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  imageUrl?: string;
  rates: { unit: "hora" | "dia"; price: number }[];
  branches: { branchId: string; branchSlug: string; branchName: string; branchCity: string; units: number }[];
}

export interface RentalPeriodInput {
  branchId: string;
  /** ISO 8601 con zona horaria. */
  startAt: string;
  endAt: string;
}

export interface RentalQuote {
  price: number;
  hours: number;
  pricing: "hora" | "dia";
  availableUnits: number;
}

export interface CreateRentalInput extends RentalPeriodInput {
  productId: string;
  customer: CustomerInfo;
  dataConsent: true;
  policyVersion?: string;
}

/** pending: unidad apartada a la espera del pago; confirmed: pagado; active: entregado; completed: devuelto. */
export type RentalStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled";

export interface CustomerRental {
  id: string;
  productId: string;
  productSlug?: string;
  productName: string;
  imageUrl?: string;
  branchId: string;
  branchName: string;
  branchCity?: string;
  branchAddress?: string;
  unitCode?: string;
  startAt: string;
  endAt: string;
  status: RentalStatus;
  price: number;
  paymentExpiresAt?: string;
  payment?: PaymentSummary;
  invoice?: InvoiceRef;
  createdAt?: string;
}
