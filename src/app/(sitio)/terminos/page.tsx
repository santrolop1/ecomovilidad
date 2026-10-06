import { siteConfig } from "@/config/site";
import { LegalPage } from "@/features/content/components/legal-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Términos y condiciones",
  description: "Condiciones de compra, alquiler y domicilios de EcoMovilidad Colombia S.A.S.",
  path: "/terminos",
});

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos y condiciones"
      description={`Condiciones de uso del portal de ${siteConfig.legalName}.`}
      sections={[
        {
          title: "Compras",
          body: (
            <p>
              Los precios se muestran en pesos colombianos con IVA incluido. Al pagar recibes la factura electrónica en tu
              correo en formatos PDF y XML.
            </p>
          ),
        },
        {
          title: "Derecho de retracto",
          body: (
            <p>
              En las compras a distancia aplica el derecho de retracto previsto en el Estatuto del Consumidor (Ley 1480 de
              2011).
            </p>
          ),
        },
        {
          title: "Alquiler",
          body: (
            <p>
              Los vehículos de alquiler se entregan revisados. Si un equipo presenta una falla durante el alquiler, gestionamos
              su reemplazo.
            </p>
          ),
        },
        {
          title: "Drones",
          body: (
            <p>
              La operación de drones debe cumplir los Reglamentos Aeronáuticos de Colombia (RAC 100 y RAC 91) de la AEROCIVIL.
              Los drones de la flota operan con geocerca y retorno automático.
            </p>
          ),
        },
        {
          title: "Entregas",
          body: <p>La entrega se certifica con el código QR único de la orden o con firma digital (Ley 527 de 1999).</p>,
        },
      ]}
    />
  );
}
