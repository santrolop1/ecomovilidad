import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const variants = {
  error: { icon: TriangleAlert, className: "border-destructive/30 bg-destructive/5 text-destructive" },
  info: { icon: Info, className: "border-border bg-muted text-foreground" },
  success: { icon: CircleCheck, className: "border-success/30 bg-success/5 text-success" },
};

export function FormAlert({ variant, children }: { variant: keyof typeof variants; children: ReactNode }) {
  const { icon: Icon, className } = variants[variant];
  return (
    <div role={variant === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-4 text-sm", className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
