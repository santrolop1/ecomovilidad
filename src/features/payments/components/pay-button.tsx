"use client";

import { CreditCard } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { startPayment } from "../actions";
import { resolveCheckoutTarget } from "../lib/checkout-url";

interface PayButtonProps {
  target: { orderId: string } | { rentalId: string };
  label?: string;
  className?: string;
}

/** Inicia el pago y lleva al cliente a la pasarela (Wompi o la simulada). */
export function PayButton({ target, label = "Pagar ahora", className }: PayButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pay() {
    setError(null);
    startTransition(async () => {
      const result = await startPayment(target);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const destination = resolveCheckoutTarget(result.data.checkoutUrl);
      if (!destination) {
        setError("No pudimos abrir la pasarela de pagos. Intenta de nuevo.");
        return;
      }
      window.location.assign(destination);
    });
  }

  return (
    <div className={className}>
      <Button type="button" size="xl" variant="brand" onClick={pay} disabled={pending} className="w-full sm:w-auto">
        <CreditCard data-icon="inline-start" aria-hidden="true" />
        {pending ? "Abriendo la pasarela…" : label}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
