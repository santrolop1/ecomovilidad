"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InventoryRow } from "@/lib/api/admin-schemas";
import { cn } from "@/lib/utils";
import { setStock } from "../actions";
import { stockUpdateSchema } from "../lib/schemas";

/**
 * Ajuste de unidades físicas por sucursal. Lo reservado por pedidos no se
 * edita aquí: el backend calcula disponible = total − reservado y rechaza un
 * total menor que lo reservado (nunca hay stock negativo). Cada cambio pide un
 * motivo y queda en el registro de movimientos.
 */
function StockRow({ productId, row }: { productId: string; row: InventoryRow }) {
  const router = useRouter();
  const [value, setValue] = useState(String(row.total));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const changed = value !== String(row.total);
  const inputId = `stock-${row.branchId}`;

  function save() {
    const input = { totalQuantity: value, reason };
    const parsed = stockUpdateSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    startTransition(async () => {
      const result = await setStock(productId, row.branchId, input);
      if (result.ok) {
        setError(undefined);
        setReason("");
        toast.success(`Stock actualizado en ${row.branchName}.`);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <li className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="font-medium">
          {row.branchName} <span className="font-normal text-muted-foreground">({row.city})</span>
        </p>
        <p className="tabular mt-0.5 text-sm text-muted-foreground">
          <span className={cn(row.available === 0 && "text-destructive")}>{row.available} disponibles</span>,{" "}
          {row.reserved} reservadas, {row.sold} vendidas
        </p>
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-xs font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div>
          <label htmlFor={inputId} className="mb-1 block text-xs text-muted-foreground">
            Unidades físicas
          </label>
          <Input
            id={inputId}
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className="h-10 w-28 bg-card"
          />
        </div>
        {changed && (
          <div className="w-full sm:w-56">
            <label htmlFor={`${inputId}-reason`} className="mb-1 block text-xs text-muted-foreground">
              Motivo
            </label>
            <Input
              id={`${inputId}-reason`}
              value={reason}
              maxLength={200}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej.: llegó mercancía"
              className="h-10 bg-card"
            />
          </div>
        )}
        <Button type="submit" size="lg" className="h-10 rounded-full" disabled={!changed || isPending}>
          {isPending ? "…" : "Guardar"}
        </Button>
      </form>
    </li>
  );
}

export function StockEditor({ productId, rows }: { productId: string; rows: InventoryRow[] }) {
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
      {rows.map((row) => (
        <StockRow key={row.branchId} productId={productId} row={row} />
      ))}
    </ul>
  );
}
