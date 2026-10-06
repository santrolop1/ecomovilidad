import Link from "next/link";
import { AlertTriangle, ArrowRight, Inbox } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { OrdersTable } from "@/features/admin/components/orders-table";
import { orderStatusLabels, rentalStatusLabels } from "@/features/admin/lib/labels";
import { adminApi } from "@/lib/api/admin";
import { orderStatuses, rentalStatuses } from "@/lib/api/admin-schemas";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getAdminUser } from "@/features/admin/lib/guard";

export const metadata = { title: { absolute: "Resumen | Panel EcoMovilidad" } };

const statusBar: Record<(typeof orderStatuses)[number], string> = {
  pending: "bg-warning",
  confirmed: "bg-ink",
  completed: "bg-success",
  cancelled: "bg-destructive/70",
};

function Figure({ label, value, detail, href }: { label: string; value: string | number; detail?: string; href?: string }) {
  const body = (
    <>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-display-tight tabular mt-1 text-2xl sm:text-3xl">{value}</dd>
      {detail && <dd className="mt-0.5 text-xs text-muted-foreground">{detail}</dd>}
    </>
  );
  return (
    <div className="min-w-0 bg-card p-4 sm:p-5">
      {href ? (
        <Link href={href} className="block rounded-md hover:opacity-80">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}

export default async function AdminDashboardPage() {
  if (!(await getAdminUser())) return null;
  const d = await adminApi.dashboard();
  const pending = d.ordersByStatus.pending ?? 0;

  return (
    <>
      <AdminPageHeader
        title="Resumen de la operación"
        description="Área metropolitana de Bucaramanga. Cifras en tiempo real desde la base de datos."
        actions={
          pending > 0 && (
            <Button asChild variant="brand" size="xl">
              <Link href="/admin/pedidos?status=pending">
                Revisar {pending} {pending === 1 ? "pedido pendiente" : "pedidos pendientes"}
              </Link>
            </Button>
          )
        }
      />

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3 xl:grid-cols-6">
        <Figure label="Pedidos" value={d.ordersTotal} detail={`${pending} pendientes`} href="/admin/pedidos" />
        <Figure label="Ventas confirmadas" value={formatCOP(d.revenueConfirmed)} detail="Confirmados y completados" />
        <Figure label="Productos activos" value={d.productsActive} detail={`${d.productsFeatured} destacados, ${d.productsTotal} en total`} href="/admin/productos" />
        <Figure label="Unidades disponibles" value={d.unitsAvailable} detail={`${d.unitsReserved} reservadas`} href="/admin/inventario" />
        <Figure label="Sucursales activas" value={d.branchesActive} detail={`${d.branchesDemo} con datos demo`} href="/admin/sucursales" />
        <Figure
          label="Usuarios"
          value={d.usersTotal}
          detail={`${d.admins} ${d.admins === 1 ? "administrador" : "administradores"}`}
          href="/admin/usuarios"
        />
      </dl>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="recientes" className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="recientes" className="font-display-tight text-lg">
              Pedidos recientes
            </h2>
            <Link href="/admin/pedidos" className="inline-flex items-center gap-1 text-sm hover:underline">
              Ver todos <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <OrdersTable
            compact
            orders={d.recentOrders}
            empty={<EmptyState icon={Inbox} title="Aún no hay pedidos" description="Los pedidos de la tienda aparecerán aquí." />}
          />
        </section>

        <section aria-labelledby="stock-bajo" className="space-y-3">
          <h2 id="stock-bajo" className="font-display-tight flex items-center gap-2 text-lg">
            <AlertTriangle className="size-5 text-warning" aria-hidden="true" />
            Stock bajo
          </h2>
          <p className="text-sm text-muted-foreground">
            Productos activos con {d.lowStockThreshold} unidades disponibles o menos, sumando sucursales.
          </p>
          {d.lowStock.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">Sin alertas.</p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {d.lowStock.map((item) => (
                <li key={item.productId}>
                  <Link href={`/admin/productos/${item.productId}`} className="flex items-center justify-between gap-3 p-3.5 hover:bg-muted/40">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{item.name}</span>
                      <span className="block text-xs text-muted-foreground">{item.sku}</span>
                    </span>
                    <span
                      className={cn(
                        "tabular shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        item.available === 0 ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning",
                      )}
                    >
                      {item.available === 0 ? "Agotado" : `${item.available} disp.`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {d.productsWithoutImage > 0 && (
            <p className="text-sm text-muted-foreground">
              {d.productsWithoutImage} {d.productsWithoutImage === 1 ? "producto activo" : "productos activos"} con imagen pendiente.
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="estados" className="rounded-2xl border border-border bg-card p-5">
          <h2 id="estados" className="font-display-tight text-lg">
            Pedidos por estado
          </h2>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            {orderStatuses.map((s) =>
              d.ordersTotal > 0 && (d.ordersByStatus[s] ?? 0) > 0 ? (
                <span key={s} className={statusBar[s]} style={{ width: `${((d.ordersByStatus[s] ?? 0) / d.ordersTotal) * 100}%` }} />
              ) : null,
            )}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {orderStatuses.map((s) => (
              <li key={s}>
                <Link href={`/admin/pedidos?status=${s}`} className="flex items-center justify-between gap-2 hover:underline">
                  <span className="flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-full", statusBar[s])} aria-hidden="true" />
                    {orderStatusLabels[s]}
                  </span>
                  <span className="tabular font-medium">{d.ordersByStatus[s] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="inventario" className="rounded-2xl border border-border bg-card p-5">
          <h2 id="inventario" className="font-display-tight text-lg">
            Inventario
          </h2>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            {d.unitsTotal > 0 && (
              <>
                <span className="bg-success" style={{ width: `${(d.unitsAvailable / d.unitsTotal) * 100}%` }} />
                <span className="bg-warning" style={{ width: `${(d.unitsReserved / d.unitsTotal) * 100}%` }} />
              </>
            )}
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Disponibles</dt><dd className="tabular font-medium">{d.unitsAvailable}</dd></div>
            <div className="flex justify-between"><dt>Reservadas (carritos y pedidos)</dt><dd className="tabular font-medium">{d.unitsReserved}</dd></div>
            <div className="flex justify-between border-t border-border pt-2"><dt>Unidades físicas</dt><dd className="tabular font-medium">{d.unitsTotal}</dd></div>
          </dl>
        </section>

        <section aria-labelledby="alquileres" className="rounded-2xl border border-border bg-card p-5">
          <h2 id="alquileres" className="font-display-tight text-lg">
            Alquileres
          </h2>
          <p className="font-display-tight tabular mt-3 text-3xl">{d.rentalsTotal}</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {rentalStatuses.map((s) => (
              <li key={s} className="flex justify-between">
                <span className="text-muted-foreground">{rentalStatusLabels[s]}</span>
                <span className="tabular">{d.rentalsByStatus[s] ?? 0}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            La tienda aún no crea alquileres: se registran en la base de datos (tabla rentals).
          </p>
        </section>
      </div>
    </>
  );
}
