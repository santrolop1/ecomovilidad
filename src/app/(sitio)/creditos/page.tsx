import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { imageCredits } from "@/config/image-credits";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Créditos de imágenes",
  description: "Autores y licencias de las fotografías usadas en el catálogo de EcoMovilidad.",
  path: "/creditos",
});

export default function CreditsPage() {
  return (
    <>
      <PageHeader
        title="Créditos de imágenes"
        description="Fotografías de Wikimedia Commons, usadas como referencia del tipo de producto mientras el catálogo es de demostración."
      />
      <Container className="py-12 sm:py-16">
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {imageCredits.map((credit) => (
            <li key={credit.file} className="grid gap-1 p-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
              <div className="min-w-0">
                <p className="truncate font-medium">{credit.title}</p>
                <p className="text-muted-foreground">Autor: {credit.author}</p>
              </div>
              <p className="flex flex-wrap gap-x-3">
                {credit.licenseUrl ? (
                  <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    {credit.license}
                  </a>
                ) : (
                  <span>{credit.license}</span>
                )}
                <a href={credit.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  Ver original
                </a>
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
