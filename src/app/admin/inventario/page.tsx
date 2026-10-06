import Link from "next/link";
import { Boxes } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { type Column, DataTable } from "@/features/admin/components/data-table";
import { FilterBar } from "@/features/admin/components/filter-bar";
import { Pagination } from "@/features/admin/components/pagination";
import { pageParam, param } from "@/features/admin/lib/params";
import { adminApi } from "@/lib/api/admin";
import type { InventoryRow } from "@/lib/api/admin-schemas";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getAdminUser } from "@/features/admin/lib/guard";

export const metadata = { title: "Inventario" };

const LOW = 5;

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
  {
    header: "Sucursal",
    cell: (r) => (
      <span className="block">
        {r.branchName}
        <span className="block text-xs text-muted-foreground">{r.city}</span>
      </span>
    ),
  },
  {
    header: "Disponible",
    numeric: true,
    cell: (r) => (
      <span className={cn("font-medium", r.available === 0 ? "text-destructive" : r.available <= LOW && "text-warning")}>
        {r.available}
      </span>
    ),
  },
  { header: "Reservado", numeric: true, cell: (r) => r.reserved },
  { header: "Total físico", numeric: true, cell: (r) => r.total },
  { header: "Vendido", numeric: true, cell: (r) => r.sold },
  { header: "Actualizado", cell: (r) => (r.updatedAt ? formatDateTime(r.updatedAt) : "—"), hideOnMobile: true, className: "hidden whitespace-nowrap xl:table-cell" },
];

export default async function AdminInventoryPage({ searchParams }: PageProps<"/admin/inventario">) {
  if (!(await getAdminUser())) return null;
  const params = await searchParams;
  const q = param(params, "q");
  const branchId = param(params, "branch");
  const low = param(params, "low") === "1" ? "1" : undefined;
  const page = pageParam(params);
  const [result, branches] = await Promise.all([
    adminApi.listInventory({ q, branch_id: branchId, low_stock: low ? true : undefined, page }),
    adminApi.listBranches(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Inventario"
        description="Existencias de productos activos por sucursal. Vendido = unidades de pedidos completados. Para ajustar unidades, abre el producto."
      />
      <FilterBar
        action="/admin/inventario"
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
            name: "low",
            label: "Existencias",
            value: low,
            options: [
              { value: "", label: "Todas" },
              { value: "1", label: `Stock bajo (≤ ${LOW})` },
            ],
          },
        ]}
      />
      <DataTable
        rows={result.items}
        columns={columns}
        rowKey={(r) => `${r.productId}-${r.branchId}`}
        rowHref={(r) => `/admin/productos/${r.productId}`}
        caption="Inventario por sucursal"
        empty={
          <EmptyState
            icon={Boxes}
            title="No hay existencias con esos filtros"
            description="Las existencias se crean al asignar unidades desde la ficha de cada producto."
            action={<Link href="/admin/productos" className="text-sm underline">Ir a productos</Link>}
          />
        }
      />
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} pathname="/admin/inventario" params={{ q, branch: branchId, low }} />
    </>
  );
}
