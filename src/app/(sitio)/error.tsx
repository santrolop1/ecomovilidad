"use client";

import { useEffect } from "react";
import { Container } from "@/components/shared/container";
import { ErrorState } from "@/components/shared/error-state";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // Punto de integración para el servicio de monitoreo de errores.
    console.error(error);
  }, [error]);

  return (
    <Container className="py-20">
      <ErrorState
        title="Algo salió mal al cargar esta página"
        description="Puedes intentarlo de nuevo. Si el problema continúa, escríbenos desde la página de contacto."
        onRetry={retry}
      />
    </Container>
  );
}
