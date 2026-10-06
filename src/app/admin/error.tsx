"use client";

import Link from "next/link";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="space-y-4">
      <ErrorState
        title="No pudimos cargar esta sección del panel"
        description={
          error.message.includes("sesión")
            ? "Tu sesión expiró. Vuelve a ingresar."
            : "Revisa que la API esté encendida e inténtalo de nuevo."
        }
        onRetry={retry}
      />
      <div className="text-center">
        <Button asChild variant="link">
          <Link href="/login?next=/admin">Ingresar de nuevo</Link>
        </Button>
      </div>
    </div>
  );
}
