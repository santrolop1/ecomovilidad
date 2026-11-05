"use server";

import { z } from "zod";
import { api } from "@/lib/api";
import { type ActionResult, runAction } from "@/lib/action-result";
import type { Order, TimeSlot } from "@/types";
import { checkoutSchema } from "./lib/schema";

const slotQuerySchema = z.object({
  date: z.iso.date("Elige una fecha válida."),
  branchId: z.uuid().optional(),
});

/** Franjas de ese día con su cupo real (CU-06). */
export async function loadTimeSlots(input: unknown): Promise<ActionResult<TimeSlot[]>> {
  return runAction(slotQuerySchema, input, ({ date, branchId }) => api.rentals.listTimeSlots(date, branchId));
}

/**
 * Crea la orden (POST /orders). El backend recalcula precios e inventario; el
 * total enviado por el navegador nunca se usa. Después el formulario inicia el
 * pago (features/payments) y lleva al cliente al Web Checkout de Wompi.
 */
export async function createOrder(input: unknown): Promise<ActionResult<Order>> {
  return runAction(checkoutSchema, input, ({ items, customer, fulfillment, dataConsent, policyVersion }) =>
    api.orders.createOrder({ items, customer, fulfillment, dataConsent, policyVersion }),
  );
}
