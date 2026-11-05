"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import type { RentalUnit } from "@/lib/api/admin-schemas";
import { finishUnitMaintenance, recordUnitUsage, setUnitThreshold } from "../actions";

export function UnitMaintenance({ unit }: { unit: RentalUnit }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [amount, setAmount] = useState("");
  const [usageNote, setUsageNote] = useState("");
  const [threshold, setThreshold] = useState(String(unit.serviceThreshold));
  const [finishNote, setFinishNote] = useState("");

  function run(action: () => Promise<ActionResult<unknown>>, message: string, reset?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setError(undefined);
        reset?.();
        toast.success(message);
        router.refresh();
      } else {
        setError(result.fieldErrors ? Object.values(result.fieldErrors)[0] : result.message);
      }
    });
  }

  return (
    <div className="space-y-5">
      {error && <FormAlert variant="error">{error}</FormAlert>}

      {unit.status === "mantenimiento" && (
        <div className="space-y-2 rounded-xl border border-border p-4">
          <Label htmlFor="m-finish">Qué se le hizo</Label>
          <Textarea id="m-finish" maxLength={300} value={finishNote} onChange={(e) => setFinishNote(e.target.value)} className="bg-card" />
          <p className="text-xs text-muted-foreground">Al terminar, el uso vuelve a cero y la unidad regresa a la oferta.</p>
          <Button
            type="button"
            className="h-10 rounded-full"
            disabled={isPending}
            onClick={() => run(() => finishUnitMaintenance(unit.id, finishNote), "Mantenimiento registrado.", () => setFinishNote(""))}
          >
            Terminar mantenimiento
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="m-amount">Registrar uso ({unit.usageUnit})</Label>
        <div className="flex flex-wrap gap-2">
          <Input id="m-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-28 bg-card" />
          <Input
            aria-label="Nota del uso (opcional)"
            placeholder="Nota (opcional)"
            maxLength={300}
            value={usageNote}
            onChange={(e) => setUsageNote(e.target.value)}
            className="min-w-40 flex-1 bg-card"
          />
          <Button
            type="button"
            className="h-10 rounded-full"
            disabled={isPending || !amount}
            onClick={() =>
              run(
                () => recordUnitUsage(unit.id, { amount, note: usageNote || undefined }),
                "Uso registrado.",
                () => {
                  setAmount("");
                  setUsageNote("");
                },
              )
            }
          >
            Registrar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="m-threshold">Umbral de mantenimiento ({unit.usageUnit})</Label>
        <div className="flex flex-wrap gap-2">
          <Input id="m-threshold" inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="w-28 bg-card" />
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full"
            disabled={isPending || threshold === String(unit.serviceThreshold)}
            onClick={() => run(() => setUnitThreshold(unit.id, threshold), "Umbral actualizado.")}
          >
            Guardar umbral
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Al llegar al 90 % la unidad sale sola de la oferta.</p>
      </div>
    </div>
  );
}
