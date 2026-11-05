import Link from "next/link";
import { Truck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { timeSlotLabels } from "@/features/account/lib/labels";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { type Column, DataTable } from "@/features/admin/components/data-table";
import { FilterBar } from "@/features/admin/components/filter-bar";
import { Pagination } from "@/features/admin/components/pagination";
import { getAdminUser } from "@/features/admin/lib/guard";
import { pageParam, param } from "@/features/admin/lib/params";
import { deliveryStatusLabels, deliveryStatusTone } from "@/features/deliveries/lib/labels";
import { adminApi } from "@/lib/api/admin";
import { type AdminDeliverySummary, deliveryStatuses } from "@/lib/api/admin-schemas";
import { formatDate, shortId } from "@/lib/format";

export const metadata = { title: "Domicilios" };

const columns: Column<AdminDeliverySummary>[] = [
  { header: "Pedido", cell: (d) => <span className="tabular">{shortId(d.orderId)}</span> },
  { header: "Estado", cell: (d) => <StatusBadge tone={deliveryStatusTone[d.status]}>{deliveryStatusLabels[d.status]}</StatusBadge> },
  {
    header: "Cliente",
    cell: (d) => (
      <span className="block min-w-0">
        <span className="block truncate">{d.contactName}</span>
        <span className="block text-xs text-muted-foreground">{d.deliveryCity}</span>
      </span>
    ),
  },
  {
    header: "Fecha",
    cell: (d) => (
      <span className="block whitespace-nowrap">
        {formatDate(`${d.scheduledDate}T12:00:00-05:00`)}
        <span className="block text-xs text-muted-foreground">{timeSlotLabels[d.timeSlot] ?? d.timeSlot}</span>
      </span>
    ),
  },
  { header: "Domiciliario", cell: (d) => d.courierName ?? "Sin asignar" },
  { header: "Despacha", cell: (d) => d.branchName, hideOnMobile: true, className: "hidden xl:table-cell" },
];

export default async function AdminDeliveriesPage({ searchParams }: PageProps<"/admin/domicilios">) {
  if (!(await getAdminUser())) return null;
  const params = await searchParams;
  const q = param(params, "q");
  const state = param(params, "state");
  const page = pageParam(params);
  const result = await adminApi.listDeliveries({ q, state, page });

  return (
    <>
      <AdminPageHeader
        title="Domicilios"
        description="Se crean solos cuando se paga un pedido a domicilio. Asigna el domiciliario y registra cada avance."
        actions={
          <Link href="/admin/domicilios/domiciliarios" className="text-sm underline">
            Gestionar domiciliarios
          </Link>
        }
      />
      <FilterBar
        action="/admin/domicilios"
        query={q}
        searchPlaceholder="Cliente o municipio"
        selects={[
          {
            name: "state",
            label: "Estado",
            value: state,
            options: [{ value: "", label: "Todos" }, ...deliveryStatuses.map((s) => ({ value: s, label: deliveryStatusLabels[s] }))],
          },
        ]}
      />
      <DataTable
        rows={result.items}
        columns={columns}
        rowKey={(d) => d.id}
        rowHref={(d) => `/admin/domicilios/${d.id}`}
        caption="Domicilios"
        empty={<EmptyState icon={Truck} title="No hay domicilios con esos filtros" description="Aparecen aquí cuando un cliente paga un pedido a domicilio." />}
      />
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} pathname="/admin/domicilios" params={{ q, state }} />
    </>
  );
}
