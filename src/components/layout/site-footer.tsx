import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Logo } from "@/components/shared/logo";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="surface-ink mt-auto border-t border-border">
      <Container className="grid gap-12 py-14 lg:grid-cols-[1.2fr_2fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-5 text-muted-foreground">
            Venta, alquiler y domicilios de bicicletas, patinetas eléctricas, patines y drones en Bucaramanga, Floridablanca, Girón y Piedecuesta.
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            <li>
              <a href={`mailto:${siteConfig.contact.email}`} className="inline-flex items-center gap-2 hover:underline">
                <Mail className="size-4 text-volt" aria-hidden="true" />
                {siteConfig.contact.email}
              </a>
            </li>
            <li>
              <a href={siteConfig.contact.phoneHref} className="inline-flex items-center gap-2 hover:underline">
                <Phone className="size-4 text-volt" aria-hidden="true" />
                {siteConfig.contact.phone}
              </a>
            </li>
          </ul>
        </div>

        <nav aria-label="Pie de página" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {siteConfig.footerNav.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold">{group.title}</h2>
              <ul className="mt-4 space-y-3">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </Container>

      <div className="border-t border-border">
        <Container className="flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.legalName}. Todos los derechos reservados.
          </p>
          <p>Tratamos tus datos personales conforme a la Ley 1581 de 2012.</p>
        </Container>
      </div>
    </footer>
  );
}
