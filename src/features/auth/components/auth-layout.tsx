import type { ReactNode } from "react";
import { Container } from "@/components/shared/container";

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

const benefits = [
  "Recupera tu carrito en cualquier dispositivo.",
  "Sigue tus domicilios y alquileres activos.",
  "Agenda mantenimientos y consulta su historial.",
];

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <Container className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[1fr_minmax(0,480px)] lg:items-start">
      <div className="lg:pt-6">
        <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">{description}</p>
        <ul className="mt-8 hidden space-y-3 lg:block">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-center gap-3">
              <span className="size-2 rounded-full bg-volt" aria-hidden="true" />
              {benefit}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">{children}</div>
    </Container>
  );
}
