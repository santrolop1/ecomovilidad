import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  /** h1 cuando el estado vacío es todo el contenido de la página (por ejemplo, el 404). */
  headingLevel?: "h1" | "h2";
}

export function EmptyState({ icon: Icon, title, description, action, className, headingLevel = "h2" }: EmptyStateProps) {
  const Heading = headingLevel;
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-muted">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <Heading className="font-display-tight mt-5 text-xl">{title}</Heading>
      <p className="mt-2 max-w-md text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
