import { Radio } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { type Column, DataTable } from "@/features/admin/components/data-table";
import { DeviceToggle, GpsDeviceForm } from "@/features/admin/components/gps-forms";
import { getAdminUser } from "@/features/admin/lib/guard";
import { assetKindLabels } from "@/features/operations/lib/labels";
import { adminApi } from "@/lib/api/admin";
import type { GpsDevice } from "@/lib/api/admin-schemas";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Dispositivos GPS" };

const columns: Column<GpsDevice>[] = [
  { header: "Código", cell: (d) => d.code },
  { header: "Tipo", cell: (d) => assetKindLabels[d.kind] },
  { header: "Asignado a", cell: (d) => d.courierName ?? d.rentalUnitCode ?? d.branchName ?? "—" },
  { header: "Último reporte", cell: (d) => (d.lastSeenAt ? formatDateTime(d.lastSeenAt) : "Nunca"), className: "whitespace-nowrap" },
  { header: "Estado", cell: (d) => <StatusBadge tone={d.isActive ? "success" : "neutral"}>{d.isActive ? "Activo" : "Inactivo"}</StatusBadge> },
  { header: "Acción", cell: (d) => <DeviceToggle id={d.id} code={d.code} isActive={d.isActive} /> },
];

export default async function AdminGpsDevicesPage() {
  if (!(await getAdminUser())) return null;
  const [devices, branches, couriers] = await Promise.all([adminApi.listGpsDevices(), adminApi.listBranches(), adminApi.listCouriers()]);
  return (
    <>
      <AdminPageHeader
        title="Dispositivos GPS"
        description="Cada aparato o app envía su posición a /api/telemetry/positions con su token. Desactivar un dispositivo invalida su token."
        back={{ href: "/admin/operacion", label: "Operación" }}
      />
      <GpsDeviceForm
        branches={branches.filter((b) => b.isActive).map((b) => ({ id: b.id, name: b.name }))}
        couriers={couriers.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name }))}
      />
      <DataTable
        rows={devices}
        columns={columns}
        rowKey={(d) => d.id}
        caption="Dispositivos GPS"
        empty={<EmptyState icon={Radio} title="Aún no hay dispositivos" description="Mientras no haya ninguno, el mapa de Operación muestra una flota simulada." />}
      />
    </>
  );
}
