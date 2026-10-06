import type { RentalDurationUnit } from "@/types";

export const durationLabels: Record<RentalDurationUnit, { per: string; plural: string }> = {
  hora: { per: "hora", plural: "Por horas" },
  dia: { per: "día", plural: "Por días" },
  semana: { per: "semana", plural: "Por semanas" },
};
