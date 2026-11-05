import { cn } from "@/lib/utils";
import type { RentalUnit } from "@/lib/api/admin-schemas";

const alertLabels: Record<RentalUnit["serviceAlert"], string> = {
  ok: "",
  proximo: "Próximo a mantenimiento",
  bloqueado: "Requiere mantenimiento",
};

/** Uso frente al umbral. El aviso no depende solo del color. */
export function UnitUsage({ unit }: { unit: RentalUnit }) {
  const percent = Math.min(unit.usagePercent, 100);
  return (
    <span className="block min-w-32">
      <span className="tabular block text-sm">
        {unit.usageValue.toLocaleString("es-CO")} de {unit.serviceThreshold.toLocaleString("es-CO")} {unit.usageUnit}
      </span>
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span
          className={cn("block h-full rounded-full bg-ink", unit.serviceAlert === "proximo" && "bg-warning", unit.serviceAlert === "bloqueado" && "bg-destructive")}
          style={{ width: `${percent}%` }}
        />
      </span>
      {unit.serviceAlert !== "ok" && (
        <span className={cn("mt-1 block text-xs font-medium", unit.serviceAlert === "bloqueado" ? "text-destructive" : "text-warning")}>
          {alertLabels[unit.serviceAlert]}
        </span>
      )}
    </span>
  );
}
