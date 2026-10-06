import { Inbox } from "lucide-react";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { setUserActive } from "@/features/admin/actions";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { ConfirmAction } from "@/features/admin/components/confirm-action";
import { OrdersTable } from "@/features/admin/components/orders-table";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { getSessionUser } from "@/features/auth/actions";
import { adminApi } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";
import { getAdminUser } from "@/features/admin/lib/guard";

export const metadata = { title: "Usuario" };

export default async function AdminUserPage({ params }: PageProps<"/admin/usuarios/[id]">) {
  if (!(await getAdminUser())) return null;
  const { id } = await params;
  const [user, me] = await Promise.all([
    adminApi.getUser(id).catch((error: unknown) => {
      if (isApiError(error) && (error.code === "NOT_FOUND" || error.code === "VALIDATION_ERROR")) notFound();
      throw error;
    }),
    getSessionUser(),
  ]);
  const isMe = me?.id === user.id;

  return (
    <>
      <AdminPageHeader
        title={`${user.firstName} ${user.lastName}`}
        description={`Registrado el ${formatDateTime(user.createdAt)}`}
        back={{ href: "/admin/usuarios", label: "Usuarios" }}
        actions={
          !isMe && (
            <ConfirmAction
              label={user.isActive ? "Desactivar cuenta" : "Reactivar cuenta"}
              title={user.isActive ? "¿Desactivar esta cuenta?" : "¿Reactivar esta cuenta?"}
              description={
                user.isActive
                  ? "La persona no podrá iniciar sesión y se cerrarán todas sus sesiones abiertas. Sus pedidos se conservan."
                  : "La persona podrá volver a iniciar sesión."
              }
              confirmLabel={user.isActive ? "Desactivar" : "Reactivar"}
              successMessage={user.isActive ? "Cuenta desactivada." : "Cuenta reactivada."}
              destructive={user.isActive}
              action={setUserActive.bind(null, user.id, !user.isActive)}
            />
          )
        }
      />
      <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="text-xs text-muted-foreground">Correo</p><p className="break-words">{user.email}</p></div>
        <div><p className="text-xs text-muted-foreground">Teléfono</p><p>{user.phone}</p></div>
        <div><p className="text-xs text-muted-foreground">Documento</p><p>{user.documentNumber ?? "No registrado"}</p></div>
        <div>
          <p className="text-xs text-muted-foreground">Cuenta</p>
          <p className="mt-0.5 flex flex-wrap gap-1">
            <StatusBadge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Activa" : "Desactivada"}</StatusBadge>
            {user.isAdmin && <StatusBadge tone="info">Administrador</StatusBadge>}
          </p>
        </div>
      </section>
      {isMe && <p className="text-sm text-muted-foreground">Esta es tu cuenta: no puedes desactivarla desde el panel.</p>}
      <p className="text-xs text-muted-foreground">El rol de administrador se asigna desde el servidor (python -m app.cli make-admin).</p>

      <section aria-labelledby="pedidos" className="space-y-3">
        <h2 id="pedidos" className="font-display-tight text-lg">
          Pedidos recientes ({user.orderCount})
        </h2>
        <OrdersTable orders={user.recentOrders} empty={<EmptyState icon={Inbox} title="Sin pedidos" description="Esta cuenta aún no ha comprado." />} />
      </section>
    </>
  );
}
