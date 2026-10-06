"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  className?: string;
}

export function QuantityStepper({ value, min = 1, max, onChange, label, className }: QuantityStepperProps) {
  const buttonClass =
    "grid size-10 place-items-center rounded-full transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40";
  return (
    <div role="group" aria-label={label} className={cn("inline-flex items-center rounded-full border border-border bg-card", className)}>
      <button type="button" className={buttonClass} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Disminuir cantidad">
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <output className="tabular w-8 text-center font-medium" aria-live="polite">
        {value}
      </output>
      <button type="button" className={buttonClass} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Aumentar cantidad">
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
