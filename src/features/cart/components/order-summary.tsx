import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { formatCOP } from "@/lib/format";

interface OrderSummaryProps {
  itemCount: number;
  subtotal: number;
  total: number;
  children?: ReactNode;
}

export function OrderSummary({ itemCount, subtotal, total, children }: OrderSummaryProps) {
  return (
    <section aria-labelledby="resumen-title" className="rounded-3xl border border-border bg-card p-6">
      <h2 id="resumen-title" className="font-display-tight text-xl">
        Resumen
      </h2>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">
            Subtotal ({itemCount} {itemCount === 1 ? "producto" : "productos"})
          </dt>
          <dd className="tabular">{formatCOP(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Envío</dt>
          <dd>Se calcula según dirección y franja</dd>
        </div>
        <Separator />
        <div className="flex items-baseline justify-between">
          <dt className="font-semibold">Total</dt>
          <dd className="tabular text-2xl font-semibold">{formatCOP(total)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">Precios en pesos colombianos con IVA incluido.</p>
      {children && <div className="mt-6 space-y-3">{children}</div>}
    </section>
  );
}
