import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-ink text-paper",
};

export function StatusBadge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone])}>
      {children}
    </span>
  );
}

export const orderStatusTone = {
  pending: "warning",
  paid: "info",
  confirmed: "info",
  completed: "success",
  cancelled: "danger",
} as const;
export const rentalStatusTone = {
  pending: "warning",
  confirmed: "info",
  active: "info",
  completed: "success",
  cancelled: "danger",
} as const;
