import { Bike } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { CourierForm, CourierToggle } from "@/features/admin/components/courier-form";
import { type Column, DataTable } from "@/features/admin/components/data-table";
import { getAdminUser } from "@/features/admin/lib/guard";
import { adminApi } from "@/lib/api/admin";
import type { Courier } from "@/lib/api/admin-schemas";

export const metadata = { title: "Domiciliarios" };

const columns: Column<Courier>[] = [
  { header: "Nombre", cell: (c) => c.name },
  { header: "Teléfono", cell: (c) => c.phone },
  { header: "Estado", cell: (c) => <StatusBadge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Activo" : "Inactivo"}</StatusBadge> },
  { header: "En curso", numeric: true, cell: (c) => c.openDeliveries },
  { header: "Acción", cell: (c) => <CourierToggle id={c.id} isActive={c.isActive} name={c.name} /> },
];

export default async function AdminCouriersPage() {
  if (!(await getAdminUser())) return null;
  const couriers = await adminApi.listCouriers();
  return (
    <>
      <AdminPageHeader
        title="Domiciliarios"
        description="Quienes aparecen disponibles al asignar un domicilio."
        back={{ href: "/admin/domicilios", label: "Domicilios" }}
      />
      <CourierForm />
      <DataTable
        rows={couriers}
        columns={columns}
        rowKey={(c) => c.id}
        caption="Domiciliarios"
        empty={<EmptyState icon={Bike} title="Aún no hay domiciliarios" description="Agrega el primero con el formulario." />}
      />
    </>
  );
}
