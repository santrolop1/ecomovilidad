"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { confirmDeliveryReceipt } from "@/features/account/actions";

/** El cliente confirma que recibió el paquete que dejó el dron (CU-08). */
export function ConfirmReceiptButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div className="space-y-2">
      {error && <FormAlert variant="error">{error}</FormAlert>}
      <Button
        type="button"
        variant="brand"
        className="h-11 w-full rounded-full"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await confirmDeliveryReceipt(orderId);
            if (result.ok) {
              setError(undefined);
              toast.success("¡Listo! Confirmaste que recibiste tu pedido.");
              router.refresh();
            } else {
              setError(result.message);
            }
          })
        }
      >
        Recibí mi pedido
      </Button>
    </div>
  );
}
