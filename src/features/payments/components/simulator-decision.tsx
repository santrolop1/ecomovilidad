"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { simulatePayment } from "../actions";

/** Botones de la pasarela simulada. Tras decidir, el cliente vuelve al resultado como con Wompi. */
export function SimulatorDecision({ reference }: { reference: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function decide(decision: "approved" | "declined") {
    setError(null);
    startTransition(async () => {
      const result = await simulatePayment({ reference, decision });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(`/pagos/resultado?id=${encodeURIComponent(result.data.transactionId)}`);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" size="xl" variant="brand" disabled={pending} onClick={() => decide("approved")}>
          Aprobar pago
        </Button>
        <Button type="button" size="xl" variant="outline" disabled={pending} onClick={() => decide("declined")}>
          Rechazar pago
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
