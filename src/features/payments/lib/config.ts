import "server-only";
import { api, isRealApi } from "@/lib/api";
import type { PaymentConfig } from "@/types";

/** Configuración de pagos para avisos en la interfaz (null sin backend o si no responde). */
export async function loadPaymentConfig(): Promise<PaymentConfig | null> {
  if (!isRealApi) return null;
  try {
    return await api.payments.getConfig();
  } catch {
    return null;
  }
}
