import type { ReactNode } from "react";
import { Container } from "./container";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

/** Cabecera de páginas internas, sobre superficie oscura para continuar el header. */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <section className="surface-ink border-b border-border">
      <Container className="pt-12 pb-10 sm:pt-16 sm:pb-14">
        <h1 className="font-display max-w-3xl text-4xl sm:text-5xl">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{description}</p>}
        {children && <div className="mt-8">{children}</div>}
      </Container>
    </section>
  );
}
