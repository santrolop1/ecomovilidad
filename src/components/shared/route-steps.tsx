import { cn } from "@/lib/utils";

export interface RouteStep {
  title: string;
  description: string;
}

interface RouteStepsProps {
  steps: RouteStep[];
  className?: string;
  /** "light" sobre fondo claro, "ink" sobre superficie oscura. */
  tone?: "light" | "ink";
}

/**
 * Pasos secuenciales unidos por una línea de ruta: el motivo visual de la
 * marca. Solo para contenido que de verdad es una secuencia.
 */
export function RouteSteps({ steps, className, tone = "light" }: RouteStepsProps) {
  return (
    <ol className={cn("relative grid gap-8 md:grid-flow-col md:auto-cols-fr md:gap-6", className)}>
      {steps.map((step, index) => (
        <li key={step.title} className="relative flex gap-4 md:flex-col md:gap-5">
          {/* Tramo de ruta hacia el siguiente paso */}
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-10 bottom-[-2rem] left-[19px] w-0.5 md:top-[19px] md:right-[-1.5rem] md:bottom-auto md:left-10 md:h-0.5 md:w-auto",
                tone === "ink" ? "bg-paper/15" : "bg-line",
              )}
            />
          )}
          <span
            className={cn(
              "tabular relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold",
              index === 0 ? "border-volt bg-volt text-ink" : tone === "ink" ? "border-paper/25 bg-ink" : "border-line bg-paper",
            )}
          >
            {index + 1}
          </span>
          <div>
            <h3 className="font-display-tight text-lg">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
