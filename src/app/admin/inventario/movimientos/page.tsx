import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { type Column, DataTable } from "@/features/admin/components/data-table";
import { FilterBar } from "@/features/admin/components/filter-bar";
import { Pagination } from "@/features/admin/components/pagination";
import { getAdminUser } from "@/features/admin/lib/guard";
import { movementKindLabels } from "@/features/admin/lib/labels";
import { pageParam, param } from "@/features/admin/lib/params";
import { adminApi } from "@/lib/api/admin";
import { type InventoryMovement, movementKinds } from "@/lib/api/admin-schemas";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Entradas y salidas" };

function origin(row: InventoryMovement) {
  if (row.orderId) {
    return (
      <Link href={`/admin/pedidos/${row.orderId}`} className="underline">
        Ver pedido
      </Link>
    );
  }
  return row.reason ?? "—";
}

const columns: Column<InventoryMovement>[] = [
  { header: "Fecha", cell: (r) => formatDateTime(r.createdAt), className: "whitespace-nowrap" },
  {
    header: "Producto",
    cell: (r) => (
      <span className="block min-w-0">
        <span className="block truncate">{r.productName}</span>
        <span className="block text-xs font-normal text-muted-foreground">{r.sku}</span>
      </span>
    ),
  },
  {
    header: "Sucursal",
    cell: (r) => (
      <span className="block">
        {r.branchName}
        <span className="block text-xs text-muted-foreground">{r.city}</span>
      </span>
    ),
  },
  { header: "Tipo", cell: (r) => movementKindLabels[r.kind] },
  {
    header: "Unidades",
    numeric: true,
    cell: (r) => (
      <span className={cn("font-medium", r.quantity < 0 && "text-destructive")}>
        {r.quantity > 0 ? `+${r.quantity}` : `−${Math.abs(r.quantity)}`}
      </span>
    ),
  },
  { header: "Saldo", numeric: true, cell: (r) => r.balanceAfter },
  { header: "Motivo", cell: origin },
  { header: "Responsable", cell: (r) => r.userName ?? "Automático", hideOnMobile: true },
];

export default async function AdminInventoryMovementsPage({ searchParams }: PageProps<"/admin/inventario/movimientos">) {
  if (!(await getAdminUser())) return null;
  const params = await searchParams;
  const q = param(params, "q");
  const branchId = param(params, "branch");
  const kind = param(params, "kind");
  const page = pageParam(params);
  const [result, branches] = await Promise.all([
    adminApi.listInventoryMovements({ q, branch_id: branchId, kind, page }),
    adminApi.listBranches(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Entradas y salidas"
        description="Cada cambio de unidades físicas, del más reciente al más antiguo. Este registro no se puede editar. Las reservas no aparecen porque no sacan unidades de la sucursal."
        back={{ href: "/admin/inventario", label: "Inventario" }}
      />
      <FilterBar
        action="/admin/inventario/movimientos"
        query={q}
        searchPlaceholder="Producto o SKU"
        selects={[
          {
            name: "branch",
            label: "Sucursal",
            value: branchId,
            options: [{ value: "", label: "Todas" }, ...branches.map((b) => ({ value: b.id, label: `${b.name} (${b.city})` }))],
          },
          {
            name: "kind",
            label: "Tipo",
            value: kind,
            options: [{ value: "", label: "Todos" }, ...movementKinds.map((k) => ({ value: k, label: movementKindLabels[k] }))],
          },
        ]}
      />
      <DataTable
        rows={result.items}
        columns={columns}
        rowKey={(r) => r.id}
        caption="Entradas y salidas de inventario"
        empty={
          <EmptyState
            icon={ArrowLeftRight}
            title="No hay movimientos con esos filtros"
            description="Prueba con otra sucursal, tipo o búsqueda."
          />
        }
      />
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} pathname="/admin/inventario/movimientos" params={{ q, branch: branchId, kind }} />
    </>
  );
}
