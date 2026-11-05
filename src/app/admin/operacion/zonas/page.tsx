import { BellOff, MapPinned } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { type Column, DataTable } from "@/features/admin/components/data-table";
import { GeofenceForm, ZoneToggle } from "@/features/admin/components/gps-forms";
import { getAdminUser } from "@/features/admin/lib/guard";
import { adminApi } from "@/lib/api/admin";
import type { Geofence, GeofenceAlert } from "@/lib/api/admin-schemas";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Zonas y alertas" };

const zoneColumns: Column<Geofence>[] = [
  { header: "Zona", cell: (z) => z.name },
  { header: "Centro", cell: (z) => <span className="tabular">{z.latitude.toFixed(4)}, {z.longitude.toFixed(4)}</span> },
  { header: "Radio", numeric: true, cell: (z) => `${(z.radiusM / 1000).toLocaleString("es-CO")} km` },
  { header: "Estado", cell: (z) => <StatusBadge tone={z.isActive ? "success" : "neutral"}>{z.isActive ? "Activa" : "Inactiva"}</StatusBadge> },
  { header: "Acción", cell: (z) => <ZoneToggle id={z.id} name={z.name} isActive={z.isActive} /> },
];

const alertColumns: Column<GeofenceAlert>[] = [
  { header: "Dispositivo", cell: (a) => a.deviceCode },
  { header: "Salió", cell: (a) => formatDateTime(a.openedAt), className: "whitespace-nowrap" },
  { header: "Volvió", cell: (a) => (a.closedAt ? formatDateTime(a.closedAt) : "Sigue afuera"), className: "whitespace-nowrap" },
  { header: "Posición al salir", cell: (a) => <span className="tabular">{a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</span> },
  { header: "Estado", cell: (a) => <StatusBadge tone={a.closedAt ? "neutral" : "danger"}>{a.closedAt ? "Cerrada" : "Abierta"}</StatusBadge> },
];

export default async function AdminZonesPage() {
  if (!(await getAdminUser())) return null;
  const [zones, alerts] = await Promise.all([adminApi.listGeofences(), adminApi.listGeofenceAlerts()]);
  return (
    <>
      <AdminPageHeader
        title="Zonas y alertas"
        description="Un activo fuera de todas las zonas activas abre una alerta; se cierra sola cuando vuelve."
        back={{ href: "/admin/operacion", label: "Operación" }}
      />
      <GeofenceForm />
      <DataTable
        rows={zones}
        columns={zoneColumns}
        rowKey={(z) => z.id}
        caption="Zonas permitidas"
        empty={<EmptyState icon={MapPinned} title="No hay zonas" description="Sin zonas activas no se generan alertas." />}
      />
      <h2 className="font-display-tight text-lg">Alertas recientes</h2>
      <DataTable
        rows={alerts}
        columns={alertColumns}
        rowKey={(a) => a.id}
        caption="Alertas de zona"
        empty={<EmptyState icon={BellOff} title="Sin alertas" description="Ningún activo ha salido de las zonas permitidas." />}
      />
    </>
  );
}
