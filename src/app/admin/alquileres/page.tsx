import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { type Column, DataTable } from "@/features/admin/components/data-table";
import { Pagination } from "@/features/admin/components/pagination";
import { rentalStatusTone, StatusBadge } from "@/features/admin/components/status-badge";
import { rentalStatusLabels } from "@/features/admin/lib/labels";
import { oneOf, pageParam, param } from "@/features/admin/lib/params";
import { adminApi } from "@/lib/api/admin";
import { type AdminRental, rentalStatuses } from "@/lib/api/admin-schemas";
import { formatCOP, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getAdminUser } from "@/features/admin/lib/guard";

export const metadata = { title: "Alquileres" };

const columns: Column<AdminRental>[] = [
  { header: "Producto", cell: (r) => r.productName },
  { header: "Estado", cell: (r) => <StatusBadge tone={rentalStatusTone[r.status]}>{rentalStatusLabels[r.status]}</StatusBadge> },
  {
    header: "Cliente",
    cell: (r) => (
      <span className="block min-w-0">
        <span className="block truncate">{r.userName}</span>
        <span className="block truncate text-xs text-muted-foreground">{r.userEmail}</span>
      </span>
    ),
  },
  { header: "Sucursal", cell: (r) => r.branchName },
  { header: "Inicio", cell: (r) => formatDateTime(r.startAt), className: "whitespace-nowrap" },
  { header: "Fin", cell: (r) => formatDateTime(r.endAt), className: "whitespace-nowrap" },
  { header: "Precio", numeric: true, cell: (r) => formatCOP(r.price) },
];

export default async function AdminRentalsPage({ searchParams }: PageProps<"/admin/alquileres">) {
  if (!(await getAdminUser())) return null;
  const params = await searchParams;
  const status = oneOf(param(params, "status"), rentalStatuses);
  const page = pageParam(params);
  const result = await adminApi.listRentals({ status, page });

  return (
    <>
      <AdminPageHeader
        title="Alquileres"
        description="Reservas registradas en la tabla rentals. La tienda todavía no crea alquileres ni calcula disponibilidad o tarifas: la oferta de /alquiler es de demostración."
      />
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {[undefined, ...rentalStatuses].map((s) => (
          <Link
            key={s ?? "todos"}
            href={s ? `/admin/alquileres?status=${s}` : "/admin/alquileres"}
            aria-current={s === status ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm transition-colors hover:border-ink/40",
              s === status && "border-ink bg-ink text-paper",
            )}
          >
            {s ? rentalStatusLabels[s] : "Todos"}
          </Link>
        ))}
      </nav>
      <DataTable
        rows={result.items}
        columns={columns}
        rowKey={(r) => r.id}
        caption="Alquileres"
        empty={
          <EmptyState
            icon={CalendarClock}
            title="No hay alquileres registrados"
            description="Cuando exista el flujo de reserva en la tienda, los alquileres aparecerán aquí."
          />
        }
      />
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} pathname="/admin/alquileres" params={{ status }} />
    </>
  );
}
