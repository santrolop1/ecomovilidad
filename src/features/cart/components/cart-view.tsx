"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "../cart-provider";
import { CartLineItem } from "./cart-line-item";
import { OrderSummary } from "./order-summary";

export function CartView() {
  const { cart, isReady, isRemote, itemCount, subtotal, total, setQuantity, removeItem, clear, refresh } = useCart();

  if (!isReady) {
    return (
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]" aria-busy="true">
        <span className="sr-only">Cargando carrito…</span>
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Tu carrito está vacío"
        description="Explora el catálogo y agrega el vehículo que quieres recibir."
        action={
          <Button asChild size="xl" variant="brand">
            <Link href="/catalogo">Explorar vehículos</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
      <section aria-labelledby="productos-title">
        <div className="flex items-center justify-between">
          <h2 id="productos-title" className="font-display-tight text-xl">
            Productos
          </h2>
          <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">
            Vaciar carrito
          </Button>
        </div>
        <ul className="divide-y divide-border border-b border-border">
          {cart.items.map((item) => (
            <CartLineItem
              key={item.productId}
              item={item}
              onQuantityChange={(quantity) => setQuantity(item.productId, quantity)}
              onRemove={() => removeItem(item.productId)}
              onReservationExpire={refresh}
            />
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          {isRemote
            ? `Apartamos las unidades de cada producto durante ${cart.reservationMinutes ?? 15} minutos desde el último cambio. Si la reserva vence, el producto sale del carrito y vuelve a estar disponible para otros clientes.`
            : "Las unidades se apartan durante 15 minutos cuando inicias sesión. Sin sesión, el carrito no reserva inventario."}
        </p>
      </section>
      <div className="lg:sticky lg:top-24">
        <OrderSummary itemCount={itemCount} subtotal={subtotal} total={total}>
          <Button asChild size="xl" variant="brand" className="w-full">
            <Link href="/checkout">Continuar al pago</Link>
          </Button>
          <Button asChild size="xl" variant="outline" className="w-full">
            <Link href="/catalogo">Seguir comprando</Link>
          </Button>
        </OrderSummary>
      </div>
    </div>
  );
}
