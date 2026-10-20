"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import type { RefundRequest } from "@/types";
import { cancelPurchase, requestRefund } from "../actions";

interface CancelRefundProps {
  kind: "pedido" | "alquiler";
  id: string;
  /** Sin pagar: se puede cancelar. */
  cancellable: boolean;
  /** Pagado y sin entregar: se puede pedir el reembolso. */
  refundable: boolean;
  refundRequest?: RefundRequest;
}

/** CU-15: cancelar lo que no se pagó o pedir el reembolso de lo pagado. */
export function CancelRefund({ kind, id, cancellable, refundable, refundRequest }: CancelRefundProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "confirm-cancel" | "refund">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const label = kind === "pedido" ? "pedido" : "alquiler";

  function run(action: () => ReturnType<typeof cancelPurchase>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.fieldErrors?.reason ?? result.message);
        return;
      }
      setMode("idle");
      router.refresh();
    });
  }

  if (refundRequest) {
    return (
      <section aria-labelledby="reembolso" className="rounded-2xl border border-border bg-card p-5 text-sm">
        <h2 id="reembolso" className="font-display-tight text-lg">
          Reembolso
        </h2>
        <p className="mt-2">
          {refundRequest.status === "reembolsada"
            ? `Reembolsado el ${formatDateTime(refundRequest.resolvedAt ?? refundRequest.createdAt)}`
            : `Solicitado el ${formatDateTime(refundRequest.createdAt)}; EcoMovilidad lo está revisando.`}
        </p>
        <p className="mt-1 text-muted-foreground">Motivo: {refundRequest.reason}</p>
      </section>
    );
  }
  if (!cancellable && !refundable) return null;

  return (
    <section aria-labelledby="cancelar" className="space-y-3 rounded-2xl border border-border bg-card p-5 text-sm">
      <h2 id="cancelar" className="font-display-tight text-lg">
        {cancellable ? `Cancelar ${label}` : "¿Necesitas un reembolso?"}
      </h2>
      {cancellable && mode !== "confirm-cancel" && (
        <Button type="button" variant="outline" onClick={() => setMode("confirm-cancel")}>
          Cancelar {label}
        </Button>
      )}
      {cancellable && mode === "confirm-cancel" && (
        <div className="space-y-2">
          <p>No se ha cobrado nada. Lo apartado se libera y no se puede deshacer.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="destructive" disabled={pending} onClick={() => run(() => cancelPurchase({ kind, id }))}>
              Sí, cancelar
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
              No
            </Button>
          </div>
        </div>
      )}
      {refundable && mode !== "refund" && (
        <>
          <p className="text-muted-foreground">Mientras no se haya entregado, puedes pedir que te devolvamos el dinero.</p>
          <Button type="button" variant="outline" onClick={() => setMode("refund")}>
            Solicitar reembolso
          </Button>
        </>
      )}
      {refundable && mode === "refund" && (
        <div className="space-y-2">
          <label htmlFor="refund-reason" className="block font-medium">
            Motivo
          </label>
          <Textarea id="refund-reason" value={reason} maxLength={500} rows={3} onChange={(e) => setReason(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={() => run(() => requestRefund({ kind, id, reason }))}>
              Enviar solicitud
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
              Volver
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
