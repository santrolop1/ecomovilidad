import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Nosotros",
  description:
    "EcoMovilidad Colombia S.A.S. une la venta de vehículos eléctricos y deportivos con servicios de alquiler y domicilios sobre su propia flota.",
  path: "/nosotros",
});

const commitments = [
  {
    title: "Datos personales",
    description: "Tratamos tu información conforme a la Ley 1581 de 2012 y solo con tu autorización expresa.",
  },
  {
    title: "Derechos del consumidor",
    description: "Aplicamos el Estatuto del Consumidor (Ley 1480 de 2011), incluido el derecho de retracto.",
  },
  {
    title: "Operación segura de drones",
    description: "La flota de drones opera con geocercas y retorno automático, conforme a los RAC 100 y 91 de la AEROCIVIL.",
  },
  {
    title: "Firma digital válida",
    description: "Las entregas confirmadas con firma digital se rigen por la Ley 527 de 1999.",
  },
];

export default async function AboutPage() {
  const news = await api.content.listNews();

  return (
    <>
      <PageHeader
        title="Nosotros"
        description="Vendemos vehículos eléctricos y deportivos nuevos, y operamos nuestra propia flota para alquiler y domicilios."
      />
      <Container className="space-y-24 py-14 sm:py-20">
        <section className="grid gap-10 lg:grid-cols-2" aria-labelledby="modelo-title">
          <h2 id="modelo-title" className="font-display-tight text-3xl sm:text-4xl">
            Dos formas de moverte, una sola plataforma
          </h2>
          <div className="space-y-4 text-lg leading-relaxed text-muted-foreground">
            <p>
              Puedes comprar una bicicleta, patineta eléctrica, patines o un dron nuevos, o alquilarlos de nuestra flota por el
              tiempo que los necesites.
            </p>
            <p>
              Entregamos y recogemos a domicilio y en puntos de servicio físicos. Cada equipo de la flota pasa por
              mantenimiento preventivo según su uso, y cada domicilio se puede seguir en el mapa.
            </p>
          </div>
        </section>

        <section aria-labelledby="compromisos-title" className="space-y-10">
          <SectionHeading id="compromisos-title" title="Nuestros compromisos" />
          <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {commitments.map((item) => (
              <li key={item.title} className="border-t-2 border-ink pt-5">
                <h3 className="font-display-tight text-lg">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="noticias-title" className="space-y-8">
          <SectionHeading id="noticias-title" title="Noticias" />
          <ul className="divide-y divide-border border-y border-border">
            {news.map((item) => (
              <li key={item.id}>
                <article className="grid gap-2 py-6 sm:grid-cols-[180px_1fr] sm:gap-8">
                  <time dateTime={item.publishedAt} className="text-sm text-muted-foreground">
                    {formatDate(item.publishedAt)}
                  </time>
                  <div>
                    <h3 className="font-display-tight text-xl">{item.title}</h3>
                    <p className="mt-1.5 text-muted-foreground">{item.excerpt}</p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </>
  );
}
