import Link from "next/link";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/features/content/components/legal-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Política de tratamiento de datos personales",
  description: "Cómo EcoMovilidad Colombia S.A.S. trata tus datos personales conforme a la Ley 1581 de 2012.",
  path: "/privacidad",
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Tratamiento de datos personales"
      description="Conforme a la Ley 1581 de 2012 (Habeas Data)."
      sections={[
        {
          title: "Responsable",
          body: <p>{siteConfig.legalName} es responsable del tratamiento de los datos personales que recolecta en este portal.</p>,
        },
        {
          title: "Autorización",
          body: (
            <p>
              Solo tratamos tus datos con tu autorización previa, expresa e informada, que otorgas al marcar la casilla
              correspondiente en cada formulario.
            </p>
          ),
        },
        {
          title: "Datos de ubicación",
          body: (
            <p>
              Para el seguimiento de domicilios y de la flota usamos datos de ubicación. Los ciframos, aplicamos políticas de
              retención y solo los capturamos con tu consentimiento explícito.
            </p>
          ),
        },
        {
          title: "Tus derechos",
          body: (
            <p>
              Puedes conocer, actualizar, rectificar y suprimir tus datos, y revocar la autorización. Escríbenos desde la{" "}
              <Link href="/contacto" className="font-medium text-foreground underline underline-offset-4">
                página de contacto
              </Link>{" "}
              o a {siteConfig.contact.email}.
            </p>
          ),
        },
      ]}
    />
  );
}
