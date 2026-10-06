"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "No pudimos cargar esta sección",
  description = "Revisa tu conexión e inténtalo de nuevo. Si el problema continúa, escríbenos desde la página de contacto.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert">
      <EmptyState
        icon={TriangleAlert}
        title={title}
        description={description}
        action={
          onRetry && (
            <Button variant="outline" size="lg" onClick={onRetry}>
              <RotateCcw data-icon="inline-start" aria-hidden="true" />
              Intentar de nuevo
            </Button>
          )
        }
      />
    </div>
  );
}
