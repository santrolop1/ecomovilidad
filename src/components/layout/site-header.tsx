import { Container } from "@/components/shared/container";
import { Logo } from "@/components/shared/logo";
import { siteConfig } from "@/config/site";
import { AccountButton } from "./account-button";
import { CartButton } from "./cart-button";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="surface-ink sticky top-0 z-40 border-b border-border/80 bg-ink/95 backdrop-blur supports-backdrop-filter:bg-ink/85">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Principal" className="hidden lg:block">
          <NavLinks items={siteConfig.mainNav} />
        </nav>
        <div className="flex items-center gap-1">
          <AccountButton />
          <CartButton />
          <MobileNav items={siteConfig.mainNav} />
        </div>
      </Container>
    </header>
  );
}
