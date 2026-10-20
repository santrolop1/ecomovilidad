"use client";

import { formatDateTime } from "@/lib/format";
import { resolveRefund } from "../actions";
import { ConfirmAction } from "./confirm-action";

interface RefundRequestCardProps {
  kind: "pedido" | "alquiler";
  id: string;
  request: { status: "abierta" | "reembolsada"; reason: string; createdAt: string; resolvedAt?: string | null };
}

/** CU-15 en el panel: solicitud del cliente y registro del reembolso. */
export function RefundRequestCard({ kind, id, request }: RefundRequestCardProps) {
  const open = request.status === "abierta";
  return (
    <section
      aria-labelledby="reembolso"
      className={open ? "rounded-2xl border border-destructive/40 bg-destructive/5 p-5" : "rounded-2xl border border-border bg-card p-5"}
    >
      <h2 id="reembolso" className="font-display-tight text-lg">
        {open ? "Reembolso solicitado" : "Reembolsado"}
      </h2>
      <p className="mt-2 text-sm">
        {open ? `Solicitado el ${formatDateTime(request.createdAt)}` : `Registrado el ${formatDateTime(request.resolvedAt ?? request.createdAt)}`}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Motivo: {request.reason}</p>
      {open && (
        <div className="mt-4">
          <ConfirmAction
            label="Registrar reembolso"
            title="¿Registrar el reembolso?"
            description={`Hazlo después de devolver el dinero en la pasarela de pagos. El ${kind} se cancela${kind === "pedido" ? " y sus unidades vuelven al inventario" : " y la unidad queda libre"}. No se puede deshacer.`}
            confirmLabel="Registrar reembolso"
            successMessage="Reembolso registrado."
            variant="brand"
            action={() => resolveRefund(kind, id)}
          />
        </div>
      )}
    </section>
  );
}
