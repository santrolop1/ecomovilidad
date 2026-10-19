"use server";

import { api } from "@/lib/api";
import { type ActionResult, runAction } from "@/lib/action-result";
import type { Order } from "@/types";
import { checkoutSchema } from "./lib/schema";

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
