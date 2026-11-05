import { Bike } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { type Column, DataTable } from "@/features/admin/components/data-table";
import { UnitStatusSelect } from "@/features/admin/components/unit-status-select";
import { UnitUsage } from "@/features/admin/components/unit-usage";
import { getAdminUser } from "@/features/admin/lib/guard";
import { adminApi } from "@/lib/api/admin";
import type { RentalUnit } from "@/lib/api/admin-schemas";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Flota de alquiler" };

const columns: Column<RentalUnit>[] = [
  {
    header: "Unidad",
    cell: (u) => (
      <span className="block min-w-0">
        <span className="tabular block font-medium">{u.code}</span>
        {u.isDemo && <span className="block text-xs text-muted-foreground">Dato de demostración</span>}
      </span>
    ),
  },
  { header: "Vehículo", cell: (u) => u.productName },
  { header: "Uso", cell: (u) => <UnitUsage unit={u} /> },
  { header: "Sucursal", cell: (u) => u.branchName },
  {
    header: "Próximo alquiler",
    cell: (u) => (u.nextRentalStart ? formatDateTime(u.nextRentalStart) : <span className="text-muted-foreground">Libre</span>),
    className: "whitespace-nowrap",
  },
  { header: "Estado", cell: (u) => <UnitStatusSelect unitId={u.id} code={u.code} status={u.status} /> },
];

export default async function AdminFleetPage() {
  if (!(await getAdminUser())) return null;
  const units = await adminApi.listRentalUnits();
  const inService = units.filter((u) => u.status === "operativo").length;
  const attention = units.filter((u) => u.serviceAlert !== "ok").length;
  return (
    <>
      <AdminPageHeader
        title="Flota de alquiler"
        description={`${units.length} unidades, ${inService} operativas. Las unidades en mantenimiento o retiradas no se ofrecen en /alquiler.`}
        back={{ href: "/admin/alquileres", label: "Alquileres" }}
      />
      {attention > 0 && (
        <p role="status" className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm font-medium">
          {attention === 1 ? "1 unidad necesita" : `${attention} unidades necesitan`} mantenimiento pronto o ya está fuera de la oferta.
        </p>
      )}
      <DataTable
        rows={units}
        columns={columns}
        rowKey={(u) => u.id}
        rowHref={(u) => `/admin/flota/${u.id}`}
        caption="Unidades de la flota"
        empty={<EmptyState icon={Bike} title="No hay unidades" description="Las unidades de la flota se cargan con el seed." />}
      />
    </>
  );
}
