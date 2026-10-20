"use server";

import { z } from "zod";
import { api } from "@/lib/api";
import { type ActionResult, runAction } from "@/lib/action-result";

/** CU-15. FastAPI valida dueño y estado: estas acciones no deciden permisos. */
const targetSchema = z.object({ kind: z.enum(["pedido", "alquiler"]), id: z.uuid("Identificador inválido.") });
const refundSchema = targetSchema.extend({
  reason: z.string().trim().min(10, "Cuéntanos el motivo (mínimo 10 caracteres).").max(500, "Máximo 500 caracteres."),
});

export async function cancelPurchase(input: unknown): Promise<ActionResult<null>> {
  return runAction(targetSchema, input, async ({ kind, id }) => {
    if (kind === "pedido") await api.orders.cancelOrder(id);
    else await api.rentals.cancelRental(id);
    return null;
  });
}

export async function requestRefund(input: unknown): Promise<ActionResult<null>> {
  return runAction(refundSchema, input, async ({ kind, id, reason }) => {
    if (kind === "pedido") await api.orders.requestOrderRefund(id, reason);
    else await api.rentals.requestRentalRefund(id, reason);
    return null;
  });
}
