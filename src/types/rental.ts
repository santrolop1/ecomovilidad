import type { ImageAsset, ProductCategorySlug } from "./catalog";

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
