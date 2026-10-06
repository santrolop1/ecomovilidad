"use client";

import type { OrderStatusValue } from "@/lib/api/admin-schemas";
import { changeOrderStatus } from "../actions";
import { orderActionHints, orderActionLabels, orderStatusLabels } from "../lib/labels";
import { ConfirmAction } from "./confirm-action";

export function OrderStatusActions({ orderId, transitions }: { orderId: string; transitions: OrderStatusValue[] }) {
  if (transitions.length === 0) {
    return <p className="text-sm text-muted-foreground">Estado final: no admite más cambios.</p>;
  }
  // Primero la acción que avanza el pedido; cancelar al final.
  const ordered = [...transitions].sort((a, b) => Number(a === "cancelled") - Number(b === "cancelled"));
  return (
    <div className="flex flex-wrap gap-2">
      {ordered.map((status) => (
        <ConfirmAction
          key={status}
          label={orderActionLabels[status]}
          title={`${orderActionLabels[status]}?`}
          description={orderActionHints[status]}
          confirmLabel={orderActionLabels[status]}
          successMessage={`Pedido ${orderStatusLabels[status].toLowerCase()}.`}
          variant={status === "cancelled" ? "outline" : "brand"}
          destructive={status === "cancelled"}
          action={() => changeOrderStatus(orderId, status)}
        />
      ))}
    </div>
  );
}
