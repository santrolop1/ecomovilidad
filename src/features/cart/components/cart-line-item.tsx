"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { ProductImage } from "@/components/shared/product-image";
import { QuantityStepper } from "@/features/catalog/components/quantity-stepper";
import { formatCOP } from "@/lib/format";
import type { CartItem } from "@/types";
import { MAX_QUANTITY_PER_ITEM } from "../lib/cart-reducer";

interface CartLineItemProps {
  item: CartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export function CartLineItem({ item, onQuantityChange, onRemove }: CartLineItemProps) {
  return (
    <li className="grid grid-cols-[88px_1fr] gap-4 py-6 sm:grid-cols-[120px_1fr]">
      <Link href={`/catalogo/${item.slug}`} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        <ProductImage image={item.image} sizes="120px" compact />
      </Link>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{item.brand}</p>
          <h3 className="font-display-tight truncate text-lg">
            <Link href={`/catalogo/${item.slug}`} className="hover:underline">
              {item.name}
            </Link>
          </h3>
          <p className="tabular mt-1 text-sm text-muted-foreground">{formatCOP(item.unitPrice)} c/u</p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <p className="tabular font-semibold">{formatCOP(item.unitPrice * item.quantity)}</p>
          <div className="flex items-center gap-2">
            <QuantityStepper
              label={`Cantidad de ${item.name}`}
              value={item.quantity}
              max={Math.min(item.maxQuantity, MAX_QUANTITY_PER_ITEM)}
              onChange={onQuantityChange}
            />
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Eliminar ${item.name} del carrito`}
              className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
