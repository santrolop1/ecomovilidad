import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { FilterBar } from "@/features/admin/components/filter-bar";
import { OrdersTable } from "@/features/admin/components/orders-table";
import { Pagination } from "@/features/admin/components/pagination";
import { orderStatusLabels } from "@/features/admin/lib/labels";
import { oneOf, pageParam, param } from "@/features/admin/lib/params";
import { adminApi } from "@/lib/api/admin";
import { orderStatuses } from "@/lib/api/admin-schemas";
import { getAdminUser } from "@/features/admin/lib/guard";

export const metadata = { title: "Pedidos" };

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/pedidos">) {
  if (!(await getAdminUser())) return null;
  const params = await searchParams;
  const q = param(params, "q");
  const status = oneOf(param(params, "status"), orderStatuses);
  const page = pageParam(params);
  const result = await adminApi.listOrders({ q, status, page });

  return (
    <>
      <AdminPageHeader title="Pedidos" description="Busca por cliente, correo o número de pedido. Cambia el estado desde el detalle." />
      <FilterBar
        action="/admin/pedidos"
        query={q}
        searchPlaceholder="Cliente, correo o #pedido"
        selects={[
          {
            name: "status",
            label: "Estado",
            value: status,
            options: [{ value: "", label: "Todos" }, ...orderStatuses.map((s) => ({ value: s, label: orderStatusLabels[s] }))],
          },
        ]}
      />
      <OrdersTable
        orders={result.items}
        empty={
          <EmptyState
            icon={Inbox}
            title={q || status ? "No hay pedidos con esos filtros" : "Aún no hay pedidos"}
            description={q || status ? "Prueba con otra búsqueda o quita el filtro de estado." : "Los pedidos de la tienda aparecerán aquí."}
          />
        }
      />
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} pathname="/admin/pedidos" params={{ q, status }} />
    </>
  );
}
