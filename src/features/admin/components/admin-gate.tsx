import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

/** Pantalla de acceso denegado o panel no disponible. */
export function AdminGate({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <main id="contenido" className="surface-ink grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <LogoMark className="mx-auto size-10" />
        <h1 className="font-display-tight mt-6 text-2xl sm:text-3xl">{title}</h1>
        <p className="mt-3 text-muted-foreground">{description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {action}
          <Button asChild variant="outline" size="xl">
            <Link href="/">Ir a la tienda</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
