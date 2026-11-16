import Link from "next/link";
import { ArrowUpRight, Download, Share, Smartphone } from "lucide-react";
import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Instalar en mi celular",
  description: "Agrega EcoMovilidad a la pantalla de inicio de tu iPhone o Android para abrirla como una app.",
  path: "/instalar",
});

const instructions = [
  {
    title: "iPhone y iPad",
    browser: "Desde Safari",
    Icon: Share,
    steps: [
      "Abre esta web en Safari. Si llegaste desde WhatsApp o Instagram, ábrela en Safari primero.",
      "Abre el menú Compartir y elige Agregar a pantalla de inicio. Puede estar dentro de Más.",
      "Si aparece Abrir como app web, déjalo activado. Toca Agregar.",
      "Busca el icono de EcoMovilidad en tu pantalla de inicio y ábrelo.",
    ],
  },
  {
    title: "Android",
    browser: "Desde Google Chrome",
    Icon: Download,
    steps: [
      "Abre esta web en Chrome con una dirección segura que empiece por https://.",
      "Abre el menú de los tres puntos y busca Agregar a pantalla principal o Instalar app.",
      "Confirma la instalación. El nombre de la opción puede variar según tu teléfono.",
      "Abre EcoMovilidad desde el nuevo icono en tu celular.",
    ],
  },
];

export default function InstallPage() {
  return (
    <>
      <PageHeader title="EcoMovilidad, a un toque." description="Agrega la app a tu pantalla de inicio para comprar, alquilar y consultar tus pedidos desde el celular." />
      <Container className="space-y-10 py-12 sm:py-16">
        <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 sm:p-7">
          <Smartphone className="mt-1 size-6 shrink-0 text-volt-strong" aria-hidden="true" />
          <div>
            <h2 className="font-display-tight text-xl">Se instala desde el navegador</h2>
            <p className="mt-2 max-w-3xl text-muted-foreground">No necesitas buscarla en una tienda de aplicaciones. Usa la misma cuenta de EcoMovilidad; es posible que debas iniciar sesión otra vez al abrirla como app.</p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {instructions.map(({ title, browser, Icon, steps }) => (
            <section key={title} aria-label={`Instalar en ${title}`} className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <Icon className="size-6 text-volt-strong" aria-hidden="true" />
              <h2 className="font-display-tight mt-5 text-2xl">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{browser}</p>
              <ol className="mt-6 list-decimal space-y-4 pl-5 marker:font-semibold marker:text-volt-strong">
                {steps.map((step) => <li key={step} className="pl-2 text-sm leading-relaxed">{step}</li>)}
              </ol>
            </section>
          ))}
        </div>
        <section aria-labelledby="install-help" className="rounded-2xl bg-muted p-6 sm:p-8">
          <h2 id="install-help" className="font-display-tight text-xl">¿No aparece la opción de instalar?</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">Comprueba que estás en Safari o Chrome y que la dirección empieza por https://. También puedes usar EcoMovilidad directamente desde el navegador.</p>
          <p className="mt-3 max-w-3xl text-muted-foreground">La app necesita conexión para consultar disponibilidad, comprar, pagar y seguir entregas. Instalarla no permite usar esos servicios sin conexión.</p>
          <Button asChild size="xl" className="mt-6"><Link href="/catalogo">Explorar vehículos<ArrowUpRight aria-hidden="true" /></Link></Button>
        </section>
      </Container>
    </>
  );
}
