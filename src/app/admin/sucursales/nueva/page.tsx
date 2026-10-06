import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { BranchForm } from "@/features/admin/components/branch-form";
import { getAdminUser } from "@/features/admin/lib/guard";

export const metadata = { title: "Nueva sucursal" };

export default async function NewBranchPage() {
  if (!(await getAdminUser())) return null;
  return (
    <>
      <AdminPageHeader title="Nueva sucursal" back={{ href: "/admin/sucursales", label: "Sucursales" }} />
      <BranchForm />
    </>
  );
}
