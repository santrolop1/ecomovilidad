"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { NavItem } from "@/config/site";
import { cn } from "@/lib/utils";
import { useSession } from "@/features/auth/use-session";
import { useLogout } from "./account-button";
import { isActivePath } from "./nav-links";

export function MobileNav({ items }: { items: readonly NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useSession();
  const { logout: signOut, isPending } = useLogout();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="rounded-full lg:hidden" aria-label="Abrir menú">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="surface-ink w-[86vw] max-w-sm border-border">
        <SheetHeader>
          <SheetTitle className="font-display-tight text-left text-xl text-foreground">Menú</SheetTitle>
          <SheetDescription className="sr-only">Navegación principal de EcoMovilidad</SheetDescription>
        </SheetHeader>
        <nav aria-label="Principal (móvil)" className="px-4">
          <ul className="flex flex-col">
            {[...items, { label: "Nosotros", href: "/nosotros" }, { label: "Contacto", href: "/contacto" }].map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href} className="border-b border-border">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between py-4 text-lg",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                    {active && <span className="size-2 rounded-full bg-volt" aria-hidden="true" />}
                  </Link>
                </li>
              );
            })}
          </ul>
          {user ? (
            <div className="mt-8 grid gap-3">
              <p className="text-sm text-muted-foreground">Sesión de {user.firstName}</p>
              <Button asChild variant="outline" size="xl">
                <Link href="/cuenta/pedidos" onClick={() => setOpen(false)}>
                  Mis pedidos
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link href="/cuenta" onClick={() => setOpen(false)}>
                  Mi cuenta
                </Link>
              </Button>
              {user.isAdmin && (
                <Button asChild variant="brand" size="xl">
                  <Link href="/admin" onClick={() => setOpen(false)}>
                    Panel de operación
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="xl" disabled={isPending} onClick={() => { setOpen(false); signOut(); }}>
                Cerrar sesión
              </Button>
            </div>
          ) : (
          <div className="mt-8 grid gap-3">
            <Button asChild variant="brand" size="xl">
              <Link href="/login" onClick={() => setOpen(false)}>
                Ingresar
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href="/registro" onClick={() => setOpen(false)}>
                Crear cuenta
              </Link>
            </Button>
          </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
