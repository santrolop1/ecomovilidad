"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/features/cart/cart-provider";
import { cn } from "@/lib/utils";

export function CartButton({ className }: { className?: string }) {
  const { itemCount, isReady } = useCart();
  const label = itemCount === 0 ? "Carrito vacío" : `Carrito, ${itemCount} ${itemCount === 1 ? "producto" : "productos"}`;

  return (
    <Link
      href="/carrito"
      aria-label={label}
      className={cn(
        "relative grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-accent",
        className,
      )}
    >
      <ShoppingBag className="size-5" aria-hidden="true" />
      {isReady && itemCount > 0 && (
        <span className="tabular absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-volt px-1 text-[0.7rem] font-semibold text-ink">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      )}
    </Link>
  );
}
