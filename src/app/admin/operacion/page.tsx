import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { getAdminUser } from "@/features/admin/lib/guard";
import { OperationsConsole } from "@/features/operations/components/operations-console";
import type { Hub } from "@/features/operations/lib/telemetry";
import { adminApi } from "@/lib/api/admin";

export const metadata = { title: "Operación" };

export default async function AdminOperationsPage() {
  if (!(await getAdminUser())) return null;
  const branches = await adminApi.listBranches();
  // Bases reales: sucursales activas con sus coordenadas de la base de datos.
  const hubs: Hub[] = branches
    .filter((branch) => branch.isActive)
    .map((branch) => ({ id: branch.id, name: branch.name, city: branch.city, location: { lat: branch.latitude, lng: branch.longitude } }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Operación"
        description="Vista operativa de la flota sobre el área metropolitana. Mientras no exista telemetría GPS, las posiciones y estados de los activos son simulados."
      />
      <OperationsConsole hubs={hubs} />
    </div>
  );
}
