import type { TimeSlot } from "@/types";
import { cn } from "@/lib/utils";

/** Franjas de entrega y recogida del día (RF 7.1). Solo lectura. */
export function TimeSlotList({ slots }: { slots: TimeSlot[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {slots.map((slot) => (
        <li
          key={slot.id}
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            slot.available ? "border-border bg-card" : "border-dashed border-border text-muted-foreground",
          )}
        >
          <span className="tabular block font-medium">{slot.label}</span>
          <span className="text-xs text-muted-foreground">{slot.available ? "Con cupo" : "Sin cupo"}</span>
        </li>
      ))}
    </ul>
  );
}
