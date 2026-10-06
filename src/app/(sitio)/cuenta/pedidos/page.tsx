import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { OrderCard } from "@/features/account/components/order-card";
import { api } from "@/lib/api";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Mis pedidos",
  description: "Estado y detalle de tus pedidos.",
  path: "/cuenta/pedidos",
  noIndex: true,
});

export default async function MyOrdersPage() {
  const orders = await api.orders.listOrders();
  return (
    <>
      <h1 className="font-display text-3xl sm:text-4xl">Mis pedidos</h1>
      {orders.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Aún no tienes pedidos"
          description="Cuando confirmes una compra aparecerá aquí con su estado."
          action={
            <Button asChild size="xl" variant="brand">
              <Link href="/catalogo">Explorar vehículos</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
