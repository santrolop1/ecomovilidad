"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";
import type { AdminRental } from "@/lib/api/admin-schemas";
import { formatDateTime } from "@/lib/format";
import { checkInRental, checkOutRental } from "../actions";

/**
 * La sucursal registra la salida del vehículo con el cliente y su entrada al
 * volver. Mientras está afuera, la unidad aparece como no disponible.
 */
export function RentalBranchLog({ rental }: { rental: AdminRental }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [note, setNote] = useState("");
  const [usage, setUsage] = useState("");
  const unit = rental.usageUnit === "horas" ? "horas de vuelo" : "km";

  function run(action: () => Promise<ActionResult<unknown>>, message: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setError(undefined);
        setNote("");
        setUsage("");
        toast.success(message);
        router.refresh();
      } else {
        setError(result.fieldErrors ? Object.values(result.fieldErrors)[0] : result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && <FormAlert variant="error">{error}</FormAlert>}
      <ol className="space-y-2 text-sm">
        <li className="flex flex-wrap justify-between gap-2">
          <span className="text-muted-foreground">Salida</span>
          <span className="tabular">
            {rental.checkedOutAt
              ? `${formatDateTime(rental.checkedOutAt)}${rental.checkedOutByName ? `, ${rental.checkedOutByName}` : ""}`
              : "Sin registrar"}
          </span>
        </li>
        <li className="flex flex-wrap justify-between gap-2">
          <span className="text-muted-foreground">Entrada</span>
          <span className="tabular">
            {rental.returnedAt
              ? `${formatDateTime(rental.returnedAt)}${rental.returnedByName ? `, ${rental.returnedByName}` : ""}${
                  rental.returnUsage != null ? ` · ${rental.returnUsage} ${unit}` : ""
                }`
              : "Sin registrar"}
          </span>
        </li>
      </ol>

      {rental.checkOutBlocker && <FormAlert variant="error">{rental.checkOutBlocker}</FormAlert>}

      {rental.canCheckOut && (
        <div className="space-y-2">
          <Label htmlFor="r-out-note">Nota de salida (opcional)</Label>
          <Input id="r-out-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Estado del vehículo, accesorios entregados…" className="bg-card" />
          <Button
            type="button"
            className="h-10 rounded-full"
            disabled={isPending}
            onClick={() => run(() => checkOutRental(rental.id, { note: note || undefined }), "Salida registrada: la unidad queda no disponible.")}
          >
            Registrar salida del vehículo
          </Button>
        </div>
      )}

      {rental.canCheckIn && (
        <div className="space-y-2">
          <p className="text-sm">
            El vehículo está con el cliente{rental.unitCode ? ` (unidad ${rental.unitCode})` : ""}. Al recibirlo, anota cuánto se usó: suma al
            mantenimiento preventivo.
          </p>
          <div className="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
            <div className="space-y-1">
              <Label htmlFor="r-usage">Uso ({unit})</Label>
              <Input id="r-usage" inputMode="decimal" value={usage} onChange={(e) => setUsage(e.target.value)} className="tabular bg-card" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="r-in-note">Nota de entrada (opcional)</Label>
              <Input id="r-in-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Daños, limpieza, batería…" className="bg-card" />
            </div>
          </div>
          <Button
            type="button"
            className="h-10 rounded-full"
            disabled={isPending || usage === ""}
            onClick={() => run(() => checkInRental(rental.id, { usage, note: note || undefined }), "Entrada registrada: la unidad vuelve a la sucursal.")}
          >
            Registrar entrada del vehículo
          </Button>
        </div>
      )}
    </div>
  );
}
