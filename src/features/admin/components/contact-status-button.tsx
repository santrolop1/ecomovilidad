"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setContactMessageStatus } from "../actions";

export function ContactStatusButton({ id, status }: { id: string; status: "nuevo" | "atendido" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const next = status === "nuevo" ? "atendido" : "nuevo";
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await setContactMessageStatus(id, next);
          if (result.ok) router.refresh();
          else toast.error(result.message);
        })
      }
    >
      {status === "nuevo" ? "Marcar atendido" : "Volver a nuevo"}
    </Button>
  );
}
