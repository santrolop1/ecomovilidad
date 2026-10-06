import { MapPinOff } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MapFallbackProps {
  description?: string;
  className?: string;
  children?: ReactNode;
}

/** Se muestra si el proveedor de mapas no carga. La información sigue disponible en `children`. */
export function MapFallback({ description, className, children }: MapFallbackProps) {
  return (
    <div role="status" className={cn("surface-ink flex size-full flex-col gap-4 rounded-3xl border border-border p-5 sm:p-6", className)}>
      <div className="flex items-start gap-3">
        <MapPinOff className="mt-0.5 size-5 shrink-0 text-volt" aria-hidden="true" />
        <div>
          <p className="font-medium">Mapa temporalmente no disponible</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {description ?? "No pudimos cargar la cartografía. La información sigue disponible a continuación."}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
