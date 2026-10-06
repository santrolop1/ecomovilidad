"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { LogoMark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logout } from "@/features/auth/actions";
import { sessionQueryKey } from "@/features/auth/use-session";
import { cartQueryKey } from "@/features/cart/cart-provider";
import { AdminNav } from "./admin-nav";

interface AdminShellProps {
  userName: string;
  userEmail: string;
  children: ReactNode;
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 rounded-md">
      <LogoMark className="size-7" />
      <span className="leading-tight">
        <span className="font-display-tight block text-[1.05rem]">EcoMovilidad</span>
        <span className="block text-xs text-muted-foreground">Panel de operación</span>
      </span>
    </Link>
  );
}

function Footer({ userName, userEmail, onLogout, pending }: { userName: string; userEmail: string; onLogout: () => void; pending: boolean }) {
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="min-w-0 text-sm">
        <p className="truncate font-medium">{userName}</p>
        <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="lg" className="rounded-full">
          <Link href="/">
            <ExternalLink data-icon="inline-start" aria-hidden="true" />
            Tienda
          </Link>
        </Button>
        <Button variant="ghost" size="lg" className="rounded-full" onClick={onLogout} disabled={pending}>
          <LogOut data-icon="inline-start" aria-hidden="true" />
          Salir
        </Button>
      </div>
    </div>
  );
}

/** Estructura del panel: barra lateral en escritorio, menú desplegable en móvil y tablet. */
export function AdminShell({ userName, userEmail, children }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  async function onLogout() {
    setPending(true);
    await logout();
    queryClient.setQueryData(sessionQueryKey, null);
    queryClient.removeQueries({ queryKey: cartQueryKey });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="surface-ink sticky top-0 hidden h-dvh flex-col gap-8 border-r border-border p-5 lg:flex">
        <Brand />
        <nav aria-label="Panel" className="flex-1 overflow-y-auto">
          <AdminNav />
        </nav>
        <Footer userName={userName} userEmail={userEmail} onLogout={onLogout} pending={pending} />
      </aside>

      <div className="surface-ink sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
        <Brand />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Abrir menú del panel">
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="surface-ink flex w-[86vw] max-w-xs flex-col gap-6 border-border p-5">
            <SheetTitle className="sr-only">Menú del panel</SheetTitle>
            <SheetDescription className="sr-only">Secciones del panel de operación</SheetDescription>
            <Brand />
            <nav aria-label="Panel (móvil)" className="flex-1 overflow-y-auto">
              <AdminNav onNavigate={() => setOpen(false)} />
            </nav>
            <Footer userName={userName} userEmail={userEmail} onLogout={onLogout} pending={pending} />
          </SheetContent>
        </Sheet>
      </div>

      <main id="contenido" className="min-w-0 bg-background">
        <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
