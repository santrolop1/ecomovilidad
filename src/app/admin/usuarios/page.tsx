import { Users } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { type Column, DataTable } from "@/features/admin/components/data-table";
import { FilterBar } from "@/features/admin/components/filter-bar";
import { Pagination } from "@/features/admin/components/pagination";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { oneOf, pageParam, param } from "@/features/admin/lib/params";
import { adminApi } from "@/lib/api/admin";
import type { AdminUser } from "@/lib/api/admin-schemas";
import { formatDate } from "@/lib/format";
import { getAdminUser } from "@/features/admin/lib/guard";

export const metadata = { title: "Usuarios" };

const columns: Column<AdminUser>[] = [
  {
    header: "Usuario",
    cell: (u) => (
      <span className="block min-w-0">
        <span className="block truncate">{u.firstName} {u.lastName}</span>
        <span className="block truncate text-xs font-normal text-muted-foreground">{u.email}</span>
      </span>
    ),
  },
  { header: "Teléfono", cell: (u) => u.phone, hideOnMobile: true },
  {
    header: "Estado",
    cell: (u) => (
      <span className="flex flex-wrap gap-1">
        <StatusBadge tone={u.isActive ? "success" : "danger"}>{u.isActive ? "Activa" : "Desactivada"}</StatusBadge>
        {u.isAdmin && <StatusBadge tone="info">Admin</StatusBadge>}
      </span>
    ),
  },
  { header: "Pedidos", numeric: true, cell: (u) => u.orderCount },
  { header: "Registro", cell: (u) => formatDate(u.createdAt), className: "whitespace-nowrap" },
];

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  if (!(await getAdminUser())) return null;
  const params = await searchParams;
  const q = param(params, "q");
  const status = oneOf(param(params, "status"), ["active", "inactive", "admin"] as const);
  const page = pageParam(params);
  const result = await adminApi.listUsers({ q, status, page });

  return (
    <>
      <AdminPageHeader title="Usuarios" description="Cuentas de clientes y administradores. No se muestran contraseñas ni sesiones." />
      <FilterBar
        action="/admin/usuarios"
        query={q}
        searchPlaceholder="Nombre o correo"
        selects={[
          {
            name: "status",
            label: "Cuenta",
            value: status,
            options: [
              { value: "", label: "Todas" },
              { value: "active", label: "Activas" },
              { value: "inactive", label: "Desactivadas" },
              { value: "admin", label: "Administradores" },
            ],
          },
        ]}
      />
      <DataTable
        rows={result.items}
        columns={columns}
        rowKey={(u) => u.id}
        rowHref={(u) => `/admin/usuarios/${u.id}`}
        caption="Usuarios"
        empty={<EmptyState icon={Users} title="No hay usuarios con esos filtros" description="Prueba con otra búsqueda." />}
      />
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} pathname="/admin/usuarios" params={{ q, status }} />
    </>
  );
}
