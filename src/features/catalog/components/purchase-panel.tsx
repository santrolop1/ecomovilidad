"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/cart-provider";
import { MAX_QUANTITY_PER_ITEM } from "@/features/cart/lib/cart-reducer";
import { productToCartItem } from "@/features/cart/lib/to-cart-item";
import type { Product } from "@/types";
import { QuantityStepper } from "./quantity-stepper";

/** CTA de compra y, cuando aplica, de alquiler. */
export function PurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem, cart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const inCart = cart.items.find((item) => item.productId === product.id)?.quantity ?? 0;
  const maxSelectable = Math.max(0, Math.min(product.stock.available, MAX_QUANTITY_PER_ITEM) - inCart);
  const soldOut = product.stock.status === "out_of_stock";

  function add() {
    addItem(productToCartItem(product), quantity);
    toast.success(`${product.name} agregado al carrito`, {
      action: { label: "Ver carrito", onClick: () => router.push("/carrito") },
    });
    setQuantity(1);
  }

  return (
    <div className="space-y-4">
      {!soldOut && maxSelectable > 0 && (
        <div className="flex items-center gap-4">
          <QuantityStepper label="Cantidad" value={quantity} max={maxSelectable} onChange={setQuantity} />
          <p className="text-sm text-muted-foreground">
            {product.stock.available} {product.stock.available === 1 ? "unidad disponible" : "unidades disponibles"}
          </p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button size="xl" variant="brand" disabled={soldOut || maxSelectable === 0} onClick={add}>
          <ShoppingBag data-icon="inline-start" aria-hidden="true" />
          {soldOut ? "Agotado" : maxSelectable === 0 ? "Máximo en el carrito" : "Agregar al carrito"}
        </Button>
        {product.rentalVehicleSlug ? (
          <Button asChild size="xl" variant="outline">
            <Link href={`/alquiler#${product.rentalVehicleSlug}`}>
              <KeyRound data-icon="inline-start" aria-hidden="true" />
              Alquilar uno similar
            </Link>
          </Button>
        ) : (
          <Button asChild size="xl" variant="outline">
            <Link href="/sucursales">Ver en sucursales</Link>
          </Button>
        )}
      </div>
      {inCart > 0 && (
        <p className="text-sm text-muted-foreground">
          Tienes {inCart} en tu carrito.{" "}
          <Link href="/carrito" className="font-medium text-foreground underline underline-offset-4">
            Ir al carrito
          </Link>
        </p>
      )}
    </div>
  );
}
