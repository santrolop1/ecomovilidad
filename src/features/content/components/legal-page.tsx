import type { ReactNode } from "react";
import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";

interface LegalSection {
  title: string;
  body: ReactNode;
}

/** Plantilla de páginas legales. El texto definitivo lo valida el área legal. */
export function LegalPage({ title, description, sections }: { title: string; description: string; sections: LegalSection[] }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Container className="py-14 sm:py-20">
        <div className="max-w-3xl space-y-10">
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            Documento en revisión por el área legal de EcoMovilidad. La versión vigente se publicará en esta misma página.
          </p>
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="font-display-tight text-xl">{section.title}</h2>
              <div className="space-y-3 leading-relaxed text-muted-foreground">{section.body}</div>
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
