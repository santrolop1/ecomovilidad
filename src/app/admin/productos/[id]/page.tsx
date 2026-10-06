import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setProductActive } from "@/features/admin/actions";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { ConfirmAction } from "@/features/admin/components/confirm-action";
import { ProductForm } from "@/features/admin/components/product-form";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { StockEditor } from "@/features/admin/components/stock-editor";
import { adminApi } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";
import { getAdminUser } from "@/features/admin/lib/guard";

export const metadata = { title: "Editar producto" };

export default async function EditProductPage({ params }: PageProps<"/admin/productos/[id]">) {
  if (!(await getAdminUser())) return null;
  const { id } = await params;
  const [product, categories] = await Promise.all([
    adminApi.getProduct(id).catch((error: unknown) => {
      if (isApiError(error) && (error.code === "NOT_FOUND" || error.code === "VALIDATION_ERROR")) notFound();
      throw error;
    }),
    adminApi.listCategories(),
  ]);

  return (
    <>
      <AdminPageHeader
        title={product.name}
        description={`${product.sku}, actualizado el ${formatDateTime(product.updatedAt)}`}
        back={{ href: "/admin/productos", label: "Productos" }}
        actions={
          <>
            {product.isActive && (
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <Link href={`/catalogo/${product.slug}`} target="_blank">
                  <ExternalLink data-icon="inline-start" aria-hidden="true" />
                  Ver en tienda
                </Link>
              </Button>
            )}
            <ConfirmAction
              label={product.isActive ? "Desactivar" : "Activar"}
              title={product.isActive ? "¿Desactivar este producto?" : "¿Activar este producto?"}
              description={
                product.isActive
                  ? "Dejará de mostrarse en la tienda y no se podrá comprar. Los pedidos existentes no cambian."
                  : "Volverá a mostrarse en la tienda con su inventario actual."
              }
              confirmLabel={product.isActive ? "Desactivar" : "Activar"}
              successMessage={product.isActive ? "Producto desactivado." : "Producto activado."}
              destructive={product.isActive}
              action={setProductActive.bind(null, product.id, !product.isActive)}
            />
          </>
        }
      />
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone={product.isActive ? "success" : "neutral"}>{product.isActive ? "Activo en la tienda" : "Inactivo"}</StatusBadge>
        <StatusBadge>{product.available} disponibles</StatusBadge>
        <StatusBadge>{product.reserved} reservadas</StatusBadge>
      </div>

      <section aria-labelledby="stock" className="space-y-3">
        <div>
          <h2 id="stock" className="font-display-tight text-lg">
            Inventario por sucursal
          </h2>
          <p className="text-sm text-muted-foreground">
            Fija las unidades físicas. Lo reservado por pedidos se descuenta automáticamente de lo disponible.
          </p>
        </div>
        <StockEditor productId={product.id} rows={product.inventory} />
      </section>

      <section aria-labelledby="datos" className="space-y-3">
        <h2 id="datos" className="font-display-tight text-lg">
          Datos del producto
        </h2>
        <ProductForm categories={categories} product={product} />
      </section>
    </>
  );
}
