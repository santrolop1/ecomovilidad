"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deliveryNextLabels } from "@/features/deliveries/lib/labels";
import type { ActionResult } from "@/lib/action-result";
import type { AdminDelivery, Courier } from "@/lib/api/admin-schemas";
import { assignDelivery, assignNearestDelivery, changeDeliveryStatus, validateDelivery } from "../actions";
import { SignaturePad } from "./signature-pad";

const selectClass = "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm";

export function DeliveryActions({ delivery, couriers }: { delivery: AdminDelivery; couriers: Courier[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [courierId, setCourierId] = useState(delivery.courierId ?? "");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<"qr" | "firma">("qr");
  const [code, setCode] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult<unknown>>, message: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setError(undefined);
        setNote("");
        toast.success(message);
        router.refresh();
      } else {
        setError(result.fieldErrors ? Object.values(result.fieldErrors)[0] : result.message);
      }
    });
  }

  const advance = delivery.allowedTransitions.filter((s) => s === "en_recogida" || s === "en_transito");
  const canFail = delivery.allowedTransitions.includes("fallido");
  const canReschedule = delivery.allowedTransitions.includes("creado");
  const active = couriers.filter((c) => c.isActive);

  if (!delivery.canAssign && !delivery.canValidate && !canFail && !canReschedule && advance.length === 0) {
    return <p className="text-sm text-muted-foreground">Estado final: no admite más cambios.</p>;
  }

  return (
    <div className="space-y-5">
      {error && <FormAlert variant="error">{error}</FormAlert>}

      {delivery.canAssign && (
        <div className="space-y-2">
          <Label htmlFor="d-courier">Domiciliario</Label>
          <div className="flex flex-wrap gap-2">
            <select id="d-courier" value={courierId} onChange={(e) => setCourierId(e.target.value)} className={`${selectClass} min-w-48 flex-1`}>
              <option value="">Elige un domiciliario</option>
              {active.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.openDeliveries} en curso)
                </option>
              ))}
            </select>
            <Button
              type="button"
              className="h-10 rounded-full"
              disabled={isPending || !courierId || courierId === delivery.courierId}
              onClick={() => run(() => assignDelivery(delivery.id, courierId), "Domiciliario asignado.")}
            >
              Asignar
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={isPending}
            onClick={() => run(() => assignNearestDelivery(delivery.id), "Asignado al domiciliario más cercano.")}
          >
            Asignar al más cercano (GPS)
          </Button>
          {active.length === 0 && <p className="text-xs text-muted-foreground">Primero agrega un domiciliario activo.</p>}
        </div>
      )}

      {advance.map((status) => (
        <Button
          key={status}
          type="button"
          className="h-10 rounded-full"
          disabled={isPending}
          onClick={() => run(() => changeDeliveryStatus(delivery.id, { status }), "Estado actualizado.")}
        >
          {deliveryNextLabels[status]}
        </Button>
      ))}

      {delivery.canValidate && (
        <fieldset className="space-y-3 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-medium">Validar la entrega</legend>
          <div className="flex gap-2">
            <Button type="button" size="sm" className="rounded-full" variant={method === "qr" ? "default" : "outline"} onClick={() => setMethod("qr")}>
              Código QR
            </Button>
            <Button type="button" size="sm" className="rounded-full" variant={method === "firma" ? "default" : "outline"} onClick={() => setMethod("firma")}>
              Firma
            </Button>
          </div>
          {method === "qr" ? (
            <div className="space-y-1">
              <Label htmlFor="d-code">Código del cliente</Label>
              <Input id="d-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className="max-w-40 bg-card" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="d-signer">Quién recibe</Label>
                <Input id="d-signer" maxLength={120} value={signerName} onChange={(e) => setSignerName(e.target.value)} className="bg-card" />
              </div>
              <SignaturePad onChange={setSignature} />
            </div>
          )}
          <Button
            type="button"
            className="h-10 rounded-full"
            disabled={isPending}
            onClick={() =>
              run(
                () =>
                  validateDelivery(
                    delivery.id,
                    method === "qr" ? { method, code } : { method, signerName, signatureImage: signature ?? "" },
                  ),
                "Entrega validada. El pedido quedó completado.",
              )
            }
          >
            Confirmar entrega
          </Button>
        </fieldset>
      )}

      {(canFail || canReschedule) && (
        <div className="space-y-2">
          <Label htmlFor="d-note">{canFail ? "Si no se pudo entregar, explica por qué" : "Nota para reprogramar (opcional)"}</Label>
          <Textarea id="d-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className="bg-card" />
          <div className="flex flex-wrap gap-2">
            {canFail && (
              <Button type="button" variant="outline" className="h-10 rounded-full" disabled={isPending} onClick={() => run(() => changeDeliveryStatus(delivery.id, { status: "fallido", note }), "Domicilio marcado como fallido.")}>
                Marcar como fallido
              </Button>
            )}
            {canReschedule && (
              <Button type="button" className="h-10 rounded-full" disabled={isPending} onClick={() => run(() => changeDeliveryStatus(delivery.id, { status: "creado", note: note || undefined }), "Domicilio reprogramado.")}>
                Reprogramar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
