import type { RentalVehicle } from "@/types";

/** RF 3.2: al 90% del umbral el activo pasa a "Requiere revisión". */
export const MAINTENANCE_LOCK_THRESHOLD = 0.9;

export function requiresReview(vehicle: Pick<RentalVehicle, "maintenance">): boolean {
  return (
    vehicle.maintenance.status !== "operational" ||
    vehicle.maintenance.thresholdUsage >= MAINTENANCE_LOCK_THRESHOLD
  );
}

/** Vehículos que pueden mostrarse en el catálogo de alquiler. */
export function filterRentableVehicles(vehicles: RentalVehicle[]): RentalVehicle[] {
  return vehicles.filter((vehicle) => !requiresReview(vehicle));
}

export function totalAvailable(vehicle: Pick<RentalVehicle, "availability">): number {
  return vehicle.availability.reduce((sum, entry) => sum + entry.available, 0);
}
