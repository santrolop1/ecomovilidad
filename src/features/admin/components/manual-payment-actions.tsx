"use client";

import { resolveManualPayment } from "../actions";
import { ConfirmAction } from "./confirm-action";

/** Confirmar o rechazar un pago manual según lo que EcoMovilidad haya recibido. */
export function ManualPaymentActions({ reference }: { reference: string }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <ConfirmAction
        label="Confirmar pago"
        title="¿Confirmar el pago recibido?"
        description="Verifica antes que el dinero llegó con esta referencia. Se descuenta el inventario y se emite la factura."
        confirmLabel="Confirmar pago"
        successMessage="Pago confirmado."
        variant="brand"
        action={() => resolveManualPayment({ reference, approved: true })}
      />
      <ConfirmAction
        label="Rechazar"
        title="¿Rechazar este pago?"
        description="El pedido sigue pendiente hasta que venza su plazo. El cliente puede iniciar un pago nuevo."
        confirmLabel="Rechazar"
        successMessage="Pago rechazado."
        destructive
        action={() => resolveManualPayment({ reference, approved: false })}
      />
    </div>
  );
}
