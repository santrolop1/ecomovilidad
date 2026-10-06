import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { ProductForm } from "@/features/admin/components/product-form";
import { adminApi } from "@/lib/api/admin";
import { getAdminUser } from "@/features/admin/lib/guard";

export const metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  if (!(await getAdminUser())) return null;
  const categories = await adminApi.listCategories();
  return (
    <>
      <AdminPageHeader
        title="Nuevo producto"
        description="Después de crearlo podrás asignar unidades en cada sucursal."
        back={{ href: "/admin/productos", label: "Productos" }}
      />
      <ProductForm categories={categories} />
    </>
  );
}
