import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PriceProps {
  amount: number;
  compareAt?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "text-base", md: "text-lg", lg: "text-3xl" };

export function Price({ amount, compareAt, className, size = "md" }: PriceProps) {
  const hasDiscount = compareAt !== undefined && compareAt > amount;
  return (
    <p className={cn("tabular flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-semibold", sizes[size])}>{formatCOP(amount)}</span>
      {hasDiscount && (
        <span className="text-sm text-muted-foreground line-through">
          <span className="sr-only">Antes </span>
          {formatCOP(compareAt)}
        </span>
      )}
    </p>
  );
}
