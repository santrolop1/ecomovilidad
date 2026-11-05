import { Check } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeliveryEvent, DeliveryStatus } from "@/types";
import { deliveryStatusLabels, deliverySteps } from "../lib/labels";

/** Avance del domicilio. Si falló, muestra lo ocurrido en lugar de los pasos que faltan. */
export function DeliveryTimeline({ status, events }: { status: DeliveryStatus; events: DeliveryEvent[] }) {
  const reached = new Map(events.map((event) => [event.status, event.createdAt]));
  const current = deliverySteps.indexOf(status);
  const steps = status === "fallido" ? events.map((event) => event.status) : deliverySteps;

  return (
    <ol className="space-y-3">
      {steps.map((step, index) => {
        const done = status === "fallido" || index <= current;
        const at = reached.get(step);
        return (
          <li key={`${step}-${index}`} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border",
                done && "border-transparent bg-ink text-background",
              )}
            >
              {done && <Check className="size-3" />}
            </span>
            <span className="min-w-0 text-sm">
              <span className={cn("block", done ? "font-medium" : "text-muted-foreground")}>{deliveryStatusLabels[step]}</span>
              {done && at && <span className="block text-xs text-muted-foreground">{formatDateTime(at)}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
