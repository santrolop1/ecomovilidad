import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { getSessionUser } from "@/features/auth/actions";
import { getAdminUser } from "@/features/admin/lib/guard";
import { isAdminAvailable } from "@/lib/api/admin";

/** El panel siempre se genera por solicitud: depende de la sesión y de datos en vivo. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s | Panel EcoMovilidad" },
  robots: { index: false, follow: false },
};

/**
 * Primera barrera (experiencia de usuario). La autorización real la hace
 * FastAPI en cada endpoint /admin: un usuario sin rol recibe 403 aunque
 * llegara a renderizar esta ruta.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!isAdminAvailable) {
    return (
      <AdminGate
        title="El panel requiere el backend"
        description="Inicia FastAPI (docker compose up -d) y ejecuta el frontend con API_MODE=real. En modo de demostración no hay datos reales que administrar."
      />
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");

  const admin = await getAdminUser();
  if (!admin) {
    return (
      <AdminGate
        title="No tienes acceso al panel"
        description="Tu cuenta no tiene rol de administrador. Si deberías tenerlo, pide a un administrador del sistema que lo asigne desde el servidor."
        action={
          <Button asChild variant="brand" size="xl">
            <Link href="/catalogo">Ver catálogo</Link>
          </Button>
        }
      />
    );
  }

  return (
    <AdminShell userName={`${admin.firstName} ${admin.lastName}`} userEmail={admin.email}>
      {children}
    </AdminShell>
  );
}
