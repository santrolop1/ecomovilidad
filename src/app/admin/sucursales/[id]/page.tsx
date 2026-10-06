import { notFound } from "next/navigation";
import { setBranchActive } from "@/features/admin/actions";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { BranchForm } from "@/features/admin/components/branch-form";
import { ConfirmAction } from "@/features/admin/components/confirm-action";
import { type Column, DataTable } from "@/features/admin/components/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { adminApi } from "@/lib/api/admin";
import type { InventoryRow } from "@/lib/api/admin-schemas";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { getAdminUser } from "@/features/admin/lib/guard";

export const metadata = { title: "Sucursal" };

const columns: Column<InventoryRow>[] = [
  {
    header: "Producto",
    cell: (r) => (
      <span className="block min-w-0">
        <span className="block truncate">{r.productName}</span>
        <span className="block text-xs font-normal text-muted-foreground">{r.sku}</span>
      </span>
    ),
  },
  { header: "Disponible", numeric: true, cell: (r) => <span className={cn(r.available === 0 && "text-destructive")}>{r.available}</span> },
  { header: "Reservado", numeric: true, cell: (r) => r.reserved },
  { header: "Total", numeric: true, cell: (r) => r.total },
  { header: "Vendido", numeric: true, cell: (r) => r.sold },
];

export default async function EditBranchPage({ params }: PageProps<"/admin/sucursales/[id]">) {
  if (!(await getAdminUser())) return null;
  const { id } = await params;
  const branch = await adminApi.getBranch(id).catch((error: unknown) => {
    if (isApiError(error) && (error.code === "NOT_FOUND" || error.code === "VALIDATION_ERROR")) notFound();
    throw error;
  });

  return (
    <>
      <AdminPageHeader
        title={`${branch.name} (${branch.city})`}
        description={`${branch.address}, ${branch.neighborhood}. Coordenadas ${branch.latitude.toFixed(4)}, ${branch.longitude.toFixed(4)}.`}
        back={{ href: "/admin/sucursales", label: "Sucursales" }}
        actions={
          <ConfirmAction
            label={branch.isActive ? "Desactivar" : "Activar"}
            title={branch.isActive ? "¿Desactivar esta sucursal?" : "¿Activar esta sucursal?"}
            description={
              branch.isActive
                ? "Dejará de mostrarse en la tienda y no se podrá elegir para recoger pedidos. Su inventario se conserva."
                : "Volverá a mostrarse en la tienda."
            }
            confirmLabel={branch.isActive ? "Desactivar" : "Activar"}
            successMessage={branch.isActive ? "Sucursal desactivada." : "Sucursal activada."}
            destructive={branch.isActive}
            action={setBranchActive.bind(null, branch.id, !branch.isActive)}
          />
        }
      />
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone={branch.isActive ? "success" : "neutral"}>{branch.isActive ? "Activa" : "Inactiva"}</StatusBadge>
        {branch.isDemo && <StatusBadge tone="warning">Datos de demostración</StatusBadge>}
      </div>

      <section aria-labelledby="inv" className="space-y-3">
        <h2 id="inv" className="font-display-tight text-lg">
          Inventario en esta sucursal
        </h2>
        <DataTable
          rows={branch.inventory}
          columns={columns}
          rowKey={(r) => r.productId}
          rowHref={(r) => `/admin/productos/${r.productId}`}
          caption={`Inventario de ${branch.name}`}
          empty={<p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">Sin existencias registradas.</p>}
        />
      </section>

      <section aria-labelledby="editar" className="space-y-3">
        <h2 id="editar" className="font-display-tight text-lg">
          Editar sucursal
        </h2>
        <BranchForm branch={branch} />
      </section>
    </>
  );
}
