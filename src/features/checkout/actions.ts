"use server";

import { api } from "@/lib/api";
import { type ActionResult, runAction } from "@/lib/action-result";
import type { Order } from "@/types";
import { checkoutSchema } from "./lib/schema";

/**
 * Crea la orden (POST /orders). El backend recalcula precios e inventario; el
 * total enviado por el navegador nunca se usa. Con Wompi, la respuesta
 * incluirá `paymentRedirectUrl` hacia la pasarela.
 */
export async function createOrder(input: unknown): Promise<ActionResult<Order>> {
  return runAction(checkoutSchema, input, ({ items, customer, fulfillment, paymentMethod, dataConsent }) =>
    api.orders.createOrder({ items, customer, fulfillment, paymentMethod, dataConsent }),
  );
}
