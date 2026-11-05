import { Wrench } from "lucide-react";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { type Column, DataTable } from "@/features/admin/components/data-table";
import { UnitMaintenance } from "@/features/admin/components/unit-maintenance";
import { UnitUsage } from "@/features/admin/components/unit-usage";
import { getAdminUser } from "@/features/admin/lib/guard";
import { maintenanceLogLabels, rentalUnitStatusLabels } from "@/features/admin/lib/labels";
import { adminApi } from "@/lib/api/admin";
import type { MaintenanceLogEntry } from "@/lib/api/admin-schemas";
import { isApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Unidad de la flota" };

const columns: Column<MaintenanceLogEntry>[] = [
  { header: "Fecha", cell: (e) => formatDateTime(e.createdAt), className: "whitespace-nowrap" },
  { header: "Evento", cell: (e) => maintenanceLogLabels[e.kind] },
  { header: "Cantidad", numeric: true, cell: (e) => (e.usageDelta === null ? "—" : `+${e.usageDelta.toLocaleString("es-CO")}`) },
  { header: "Uso acumulado", numeric: true, cell: (e) => e.usageAfter.toLocaleString("es-CO") },
  { header: "Nota", cell: (e) => e.note ?? "—" },
  { header: "Responsable", cell: (e) => e.userName ?? "—", hideOnMobile: true },
];

export default async function AdminFleetUnitPage({ params }: PageProps<"/admin/flota/[id]">) {
  if (!(await getAdminUser())) return null;
  const { id } = await params;
  const [unit, log] = await Promise.all([
    adminApi.getRentalUnit(id).catch((error: unknown) => {
      if (isApiError(error) && (error.code === "NOT_FOUND" || error.code === "VALIDATION_ERROR")) notFound();
      throw error;
    }),
    adminApi.listMaintenanceLog(id).catch(() => []),
  ]);

  return (
    <>
      <AdminPageHeader
        title={`Unidad ${unit.code}`}
        description={`${unit.productName}, sucursal ${unit.branchName}.`}
        back={{ href: "/admin/flota", label: "Flota" }}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display-tight text-lg">Uso desde la última revisión</h2>
            <StatusBadge tone={unit.status === "operativo" ? "success" : "warning"}>{rentalUnitStatusLabels[unit.status]}</StatusBadge>
          </div>
          <UnitUsage unit={unit} />
          {unit.nextRentalStart && unit.status !== "operativo" && (
            <p className="text-sm font-medium text-destructive">
              Tiene un alquiler reservado para el {formatDateTime(unit.nextRentalStart)}: reasígnalo o cancélalo.
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display-tight text-lg">Mantenimiento</h2>
          <UnitMaintenance key={`${unit.status}-${unit.serviceThreshold}`} unit={unit} />
        </section>
      </div>
      <h2 className="font-display-tight text-lg">Bitácora</h2>
      <p className="text-sm text-muted-foreground">Este registro no se puede editar ni borrar.</p>
      <DataTable
        rows={log}
        columns={columns}
        rowKey={(e) => e.id}
        caption="Bitácora de mantenimiento"
        empty={<EmptyState icon={Wrench} title="Sin eventos todavía" description="Aquí queda cada uso y cada mantenimiento de la unidad." />}
      />
    </>
  );
}
