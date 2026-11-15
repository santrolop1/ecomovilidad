import { StatusBadge } from "@/components/shared/status-badge";
import type { RentalUnit } from "@/lib/api/admin-schemas";
import { formatDate, formatDateTime } from "@/lib/format";

const labels: Record<RentalUnit["availability"], string> = {
  disponible: "En la sucursal",
  fuera: "Afuera con un cliente",
  mantenimiento: "No disponible: mantenimiento",
  retirada: "Retirada",
};

const tones = { disponible: "success", fuera: "info", mantenimiento: "warning", retirada: "neutral" } as const;

/** Dónde está la unidad ahora. Mientras está afuera, no se ofrece en /alquiler. */
export function UnitAvailability({ unit }: { unit: RentalUnit }) {
  return (
    <span className="block min-w-36 space-y-1">
      <StatusBadge tone={tones[unit.availability]}>{labels[unit.availability]}</StatusBadge>
      {unit.availability === "fuera" && unit.expectedReturnAt && (
        <span className="block text-xs text-muted-foreground">Vuelve el {formatDateTime(unit.expectedReturnAt)}</span>
      )}
    </span>
  );
}

/** Próxima revisión periódica (mantenimiento por tiempo). */
export function UnitNextService({ unit }: { unit: RentalUnit }) {
  const overdue = unit.daysToService < 0;
  return (
    <span className="block min-w-32 text-sm">
      <span className="tabular block">{formatDate(unit.nextServiceAt)}</span>
      <span className={overdue ? "block text-xs font-medium text-destructive" : "block text-xs text-muted-foreground"}>
        {overdue
          ? `Vencida hace ${Math.abs(unit.daysToService)} días`
          : unit.daysToService === 0
            ? "Hoy"
            : `En ${unit.daysToService} días · cada ${unit.serviceIntervalDays}`}
      </span>
    </span>
  );
}
