"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 24; // unos 2 minutos

/** Mientras la pasarela procesa el pago (p. ej. PSE), vuelve a consultar el estado. */
export function PendingRefresh() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS) return;
    const timer = window.setTimeout(() => {
      setAttempts((n) => n + 1);
      router.refresh();
    }, INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [attempts, router]);
  return (
    <p className="text-sm text-muted-foreground" aria-live="polite">
      {attempts < MAX_ATTEMPTS
        ? "Consultamos el estado cada pocos segundos…"
        : "El pago sigue en proceso. Te avisaremos por correo; también puedes revisarlo en Mi cuenta."}
    </p>
  );
}
