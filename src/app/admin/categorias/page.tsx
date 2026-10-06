import Link from "next/link";
import { FolderTree } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { CategoryDialog } from "@/features/admin/components/category-dialog";
import { adminApi } from "@/lib/api/admin";
import { getAdminUser } from "@/features/admin/lib/guard";

export const metadata = { title: "Categorías" };

export default async function AdminCategoriesPage() {
  if (!(await getAdminUser())) return null;
  const categories = await adminApi.listCategories();
  return (
    <>
      <AdminPageHeader
        title="Categorías"
        description="El modelo actual no permite desactivar ni eliminar categorías: los productos dependen de ellas."
        actions={<CategoryDialog />}
      />
      {categories.length === 0 ? (
        <EmptyState icon={FolderTree} title="Sin categorías" description="Crea la primera categoría." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {categories.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
              <div className="min-w-0 flex-1">
                <h2 className="font-display-tight text-lg">{c.name}</h2>
                <p className="text-xs text-muted-foreground">/{c.slug}</p>
                <p className="mt-2 text-sm text-muted-foreground">{c.description || "Sin descripción."}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Link href={`/admin/productos?category=${c.slug}`} className="text-sm hover:underline">
                  {c.productCount} {c.productCount === 1 ? "producto" : "productos"}
                </Link>
                <CategoryDialog category={c} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
