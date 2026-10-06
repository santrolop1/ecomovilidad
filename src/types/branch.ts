import type { ProductCategorySlug } from "./catalog";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface OpeningHours {
  /** Ej. "Lunes a viernes" */
  days: string;
  opens: string; // "08:00"
  closes: string; // "19:00"
}

export type BranchServiceKind = "venta" | "alquiler" | "mantenimiento" | "recogida" | "devolucion";

export interface BranchInventory {
  category: ProductCategorySlug;
  available: number;
}

export interface Branch {
  id: string;
  slug: string;
  name: string;
  city: string;
  neighborhood: string;
  address: string;
  location: GeoPoint;
  phone: string;
  hours: OpeningHours[];
  services: BranchServiceKind[];
  /** Disponibilidad por categoría (RF 1.2: en tiempo real cuando exista backend). */
  inventory: BranchInventory[];
  /** ISO 8601 de la última actualización de inventario. */
  inventoryUpdatedAt?: string;
  /** Datos de demostración: no corresponden a una sucursal real. */
  isDemo: boolean;
}
