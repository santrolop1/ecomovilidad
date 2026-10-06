import { Plane } from "lucide-react";

/** Aviso normativo para drones (SRS: RAC 100 / RAC 91 de la AEROCIVIL). */
export function DroneRegulatoryNotice() {
  return (
    <aside className="flex gap-3 rounded-2xl border border-border bg-muted p-4 text-sm">
      <Plane className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <p>
        La operación de drones en Colombia está regulada por la AEROCIVIL (RAC 100 y RAC 91). Antes de volar, verifica las
        zonas permitidas y los requisitos que aplican a tu uso.
      </p>
    </aside>
  );
}
