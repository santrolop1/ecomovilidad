import { FlaskConical } from "lucide-react";
import type { PaymentConfig } from "@/types";

/** Aviso visible cuando los pagos no cobran dinero real (pasarela simulada o Wompi sandbox). */
export function PaymentModeNotice({ config }: { config: PaymentConfig | null }) {
  if (!config?.enabled || !config.sandbox) return null;
  const text =
    config.provider === "simulado"
      ? "Modo de pruebas: el pago se aprueba o rechaza en una pasarela simulada, sin cobro real. EcoMovilidad usará Wompi cuando se configuren sus llaves."
      : "Wompi en modo de pruebas (sandbox): usa sus tarjetas de prueba; no se cobra dinero real.";
  return (
    <p className="flex items-start gap-2 rounded-xl border border-dashed border-warning/60 bg-warning/5 p-3 text-sm">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      {text}
    </p>
  );
}
