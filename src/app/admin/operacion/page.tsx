import Link from "next/link";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { getAdminUser } from "@/features/admin/lib/guard";
import { OperationsConsole } from "@/features/operations/components/operations-console";
import type { Hub } from "@/features/operations/lib/telemetry";
import { adminApi } from "@/lib/api/admin";

export const metadata = { title: "Operación" };

export default async function AdminOperationsPage() {
  if (!(await getAdminUser())) return null;
  const [branches, fleet] = await Promise.all([adminApi.listBranches(), adminApi.fleet()]);
  // Bases reales: sucursales activas con sus coordenadas de la base de datos.
  const hubs: Hub[] = branches
    .filter((branch) => branch.isActive)
    .map((branch) => ({ id: branch.id, name: branch.name, city: branch.city, location: { lat: branch.latitude, lng: branch.longitude } }));

  // Con al menos un dispositivo registrado la consola muestra datos reales.
  const live = fleet.activeDevices > 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Operación"
        description={
          live
            ? "Posiciones reales que envían los dispositivos GPS registrados."
            : "Aún no hay dispositivos GPS registrados: las posiciones y estados de los activos son simulados."
        }
        actions={
          <>
            <Link href="/admin/operacion/dispositivos" className="text-sm underline">Dispositivos GPS</Link>
            <Link href="/admin/operacion/zonas" className="text-sm underline">Zonas y alertas</Link>
          </>
        }
      />
      <OperationsConsole hubs={hubs} live={live} />
    </div>
  );
}
