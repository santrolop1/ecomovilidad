import Link from "next/link";
import { Container } from "@/components/shared/container";
import { JsonLd } from "@/components/shared/json-ld";
import { PageHeader } from "@/components/shared/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Centro de ayuda",
  description: "Preguntas frecuentes sobre compras, pagos, alquiler, domicilios, drones y datos personales en EcoMovilidad.",
  path: "/ayuda",
});

export default async function HelpPage() {
  const groups = await api.content.listFaqs();
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    ),
  };

  return (
    <>
      <JsonLd data={faqJsonLd} />
      <PageHeader title="Centro de ayuda" description="Respuestas rápidas sobre compras, alquiler, domicilios y más." />
      <Container className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Temas de ayuda" className="hidden lg:block">
          <ul className="sticky top-24 space-y-1">
            {groups.map((group) => (
              <li key={group.id}>
                <a href={`#${group.id}`} className="block rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                  {group.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-14">
          {groups.map((group) => (
            <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`} className="scroll-mt-24">
              <h2 id={`${group.id}-title`} className="font-display-tight text-2xl">
                {group.title}
              </h2>
              <Accordion type="multiple" className="mt-4 rounded-2xl border border-border bg-card px-5">
                {group.items.map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger className="py-5 text-base">{item.question}</AccordionTrigger>
                    <AccordionContent className="pb-5 text-[0.95rem] leading-relaxed text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
          <div className="rounded-2xl bg-muted p-6 sm:p-8">
            <h2 className="font-display-tight text-xl">¿No encontraste tu respuesta?</h2>
            <p className="mt-2 text-muted-foreground">Escríbenos y te respondemos por correo.</p>
            <Button asChild size="xl" className="mt-5">
              <Link href="/contacto">Escribir a soporte</Link>
            </Button>
          </div>
        </div>
      </Container>
    </>
  );
}
