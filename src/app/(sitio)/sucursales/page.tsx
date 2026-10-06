import { Container } from "@/components/shared/container";
import { JsonLd } from "@/components/shared/json-ld";
import { PageHeader } from "@/components/shared/page-header";
import { env } from "@/config/env";
import { siteConfig } from "@/config/site";
import { BranchExplorer } from "@/features/branches/components/branch-explorer";
import { api } from "@/lib/api";
import { createPageMetadata } from "@/lib/seo";
import type { Branch } from "@/types";

export const metadata = createPageMetadata({
  title: "Sucursales y puntos de servicio",
  description: "Puntos de servicio de EcoMovilidad en Bucaramanga, Floridablanca, Girón y Piedecuesta: horarios, servicios y disponibilidad.",
  path: "/sucursales",
});

const dayCodes: Record<string, string[]> = {
  "Lunes a viernes": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  Sábados: ["Saturday"],
  "Domingos y festivos": ["Sunday"],
};

function branchesJsonLd(branches: Branch[]) {
  return branches.map((branch) => ({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${siteConfig.name} ${branch.city}, ${branch.name}`,
    telephone: branch.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: branch.address,
      addressLocality: branch.city,
      addressCountry: "CO",
    },
    geo: { "@type": "GeoCoordinates", latitude: branch.location.lat, longitude: branch.location.lng },
    openingHoursSpecification: branch.hours.map((hours) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: dayCodes[hours.days] ?? [],
      opens: hours.opens,
      closes: hours.closes,
    })),
  }));
}

export default async function BranchesPage() {
  const branches = await api.branches.listBranches();

  return (
    <>
      <JsonLd data={branchesJsonLd(branches)} />
      <PageHeader
        title="Puntos de servicio"
        description="Compra, recoge, devuelve o lleva tu vehículo al taller en el área metropolitana de Bucaramanga. Las sucursales que ves son datos de demostración."
      />
      <Container className="py-10 sm:py-14">
        <BranchExplorer
          initialBranches={branches}
          mapConfig={{ apiKey: env.googleMapsApiKey, mapId: env.googleMapsMapId }}
        />
      </Container>
    </>
  );
}
