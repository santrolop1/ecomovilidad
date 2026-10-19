"use server";

import { z } from "zod";
import { api } from "@/lib/api";
import { type ActionResult, runAction } from "@/lib/action-result";
import type { PaymentStart } from "@/types";

const targetSchema = z.union([
  z.object({ orderId: z.uuid("Pedido no válido.") }),
  z.object({ rentalId: z.uuid("Alquiler no válido.") }),
]);

/**
 * Crea un intento de pago (POST /payments) y devuelve la URL del Web Checkout
 * de Wompi, firmada en el backend. El navegador nunca ve los secretos.
 */
export async function startPayment(input: unknown): Promise<ActionResult<PaymentStart>> {
  return runAction(targetSchema, input, (target) => api.payments.start(target));
}

const simulationSchema = z.object({
  reference: z.string().regex(/^[A-Za-z0-9-]{3,64}$/, "Referencia no válida."),
  decision: z.enum(["approved", "declined"]),
});

/** Pasarela simulada: registra la decisión del cliente y devuelve la transacción para verificarla. */
export async function simulatePayment(input: unknown): Promise<ActionResult<{ transactionId: string }>> {
  return runAction(simulationSchema, input, ({ reference, decision }) => api.payments.simulate(reference, decision));
}
