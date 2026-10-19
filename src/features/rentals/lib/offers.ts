import type { RentalOffer } from "@/types";

/** Requisitos por categoría que el cliente debe conocer antes de alquilar. */
export const categoryRequirements: Partial<Record<string, string[]>> = {
  drones: [
    "La operación debe cumplir los Reglamentos Aeronáuticos de Colombia (RAC 100 y RAC 91) de la AEROCIVIL.",
    "Se entrega con una sesión corta de verificación en la sucursal.",
  ],
};

export function totalUnits(offer: Pick<RentalOffer, "branches">): number {
  return offer.branches.reduce((sum, branch) => sum + branch.units, 0);
}

export function cheapestRate(offer: Pick<RentalOffer, "rates">): RentalOffer["rates"][number] | undefined {
  return [...offer.rates].sort((a, b) => a.price - b.price)[0];
}

/** Bogotá no tiene horario de verano: siempre UTC−5. */
export function bogotaIso(date: string, time: string): string {
  return `${date}T${time}:00-05:00`;
}

/** Horas en punto y medias entre la apertura y el cierre típicos (la API valida el horario real). */
export function timeOptions(from = "06:00", to = "21:00"): string[] {
  const [fromH, fromM] = from.split(":").map(Number);
  const [toH, toM] = to.split(":").map(Number);
  const options: string[] = [];
  for (let minutes = fromH * 60 + fromM; minutes <= toH * 60 + toM; minutes += 30) {
    options.push(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
  }
  return options;
}
