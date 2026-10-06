import type { StockStatus } from "@/types";
import { cn } from "@/lib/utils";

const labels: Record<StockStatus, string> = {
  in_stock: "Disponible",
  low_stock: "Últimas unidades",
  out_of_stock: "Agotado",
};

const dotStyles: Record<StockStatus, string> = {
  in_stock: "bg-success",
  low_stock: "bg-warning",
  out_of_stock: "bg-muted-foreground",
};

export function StockBadge({ status, className }: { status: StockStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
      <span className={cn("size-2 rounded-full", dotStyles[status])} aria-hidden="true" />
      {labels[status]}
    </span>
  );
}
