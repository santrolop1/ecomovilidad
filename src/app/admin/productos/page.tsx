import Link from "next/link";
import { PackageSearch, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductImage } from "@/components/shared/product-image";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { type Column, DataTable } from "@/features/admin/components/data-table";
import { FilterBar } from "@/features/admin/components/filter-bar";
import { Pagination } from "@/features/admin/components/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { oneOf, pageParam, param } from "@/features/admin/lib/params";
import { adminApi } from "@/lib/api/admin";
import type { AdminProduct } from "@/lib/api/admin-schemas";
import { formatCOP } from "@/lib/format";
import { getAdminUser } from "@/features/admin/lib/guard";

export const metadata = { title: "Productos" };

const columns: Column<AdminProduct>[] = [
  {
    header: "Producto",
    cell: (p) => (
      <span className="flex items-center gap-3">
        <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
          <ProductImage image={p.imageUrl ? { src: p.imageUrl, alt: "" } : undefined} sizes="44px" compact />
        </span>
        <span className="min-w-0">
          <span className="block truncate">{p.name}</span>
          <span className="block text-xs font-normal text-muted-foreground">{p.sku}</span>
        </span>
      </span>
    ),
  },
  { header: "Categoría", cell: (p) => p.category.name },
  {
    header: "Precio",
    numeric: true,
    cell: (p) => (
      <span>
        {formatCOP(p.price)}
        {p.compareAtPrice && <span className="block text-xs text-muted-foreground line-through">{formatCOP(p.compareAtPrice)}</span>}
      </span>
    ),
  },
  {
    header: "Disponible",
    numeric: true,
    cell: (p) => (
      <span className={p.available === 0 ? "text-destructive" : p.available <= 5 ? "text-warning" : undefined}>
        {p.available}
        {p.reserved > 0 && <span className="block text-xs text-muted-foreground">{p.reserved} reservadas</span>}
      </span>
    ),
  },
  {
    header: "Estado",
    cell: (p) => (
      <span className="flex flex-wrap gap-1">
        <StatusBadge tone={p.isActive ? "success" : "neutral"}>{p.isActive ? "Activo" : "Inactivo"}</StatusBadge>
        {p.isFeatured && <StatusBadge tone="info">Destacado</StatusBadge>}
        {!p.imageUrl && <StatusBadge tone="warning">Sin foto</StatusBadge>}
      </span>
    ),
  },
];

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/productos">) {
  if (!(await getAdminUser())) return null;
  const params = await searchParams;
  const q = param(params, "q");
  const category = param(params, "category");
  const status = oneOf(param(params, "status"), ["active", "inactive"] as const);
  const featured = oneOf(param(params, "featured"), ["true", "false"] as const);
  const page = pageParam(params);
  const [result, categories] = await Promise.all([
    adminApi.listProducts({ q, category, status, featured, page }),
    adminApi.listCategories(),
  ]);
  const filtered = Boolean(q || category || status || featured);

  return (
    <>
      <AdminPageHeader
        title="Productos"
        description="Catálogo completo, incluidos los inactivos (no visibles en la tienda)."
        actions={
          <Button asChild variant="brand" size="xl">
            <Link href="/admin/productos/nuevo">
              <Plus data-icon="inline-start" aria-hidden="true" />
              Nuevo producto
            </Link>
          </Button>
        }
      />
      <FilterBar
        action="/admin/productos"
        query={q}
        searchPlaceholder="Nombre, SKU o marca"
        selects={[
          {
            name: "category",
            label: "Categoría",
            value: category,
            options: [{ value: "", label: "Todas" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))],
          },
          {
            name: "status",
            label: "Estado",
            value: status,
            options: [
              { value: "", label: "Todos" },
              { value: "active", label: "Activos" },
              { value: "inactive", label: "Inactivos" },
            ],
          },
          {
            name: "featured",
            label: "Destacados",
            value: featured,
            options: [
              { value: "", label: "Todos" },
              { value: "true", label: "Solo destacados" },
              { value: "false", label: "No destacados" },
            ],
          },
        ]}
      />
      <DataTable
        rows={result.items}
        columns={columns}
        rowKey={(p) => p.id}
        rowHref={(p) => `/admin/productos/${p.id}`}
        caption="Productos"
        empty={
          <EmptyState
            icon={PackageSearch}
            title={filtered ? "No hay productos con esos filtros" : "Aún no hay productos"}
            description={filtered ? "Cambia la búsqueda o los filtros." : "Crea el primer producto del catálogo."}
          />
        }
      />
      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        pathname="/admin/productos"
        params={{ q, category, status, featured }}
      />
    </>
  );
}
