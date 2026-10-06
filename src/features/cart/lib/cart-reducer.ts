import type { Cart, CartItem } from "@/types";

export const MAX_QUANTITY_PER_ITEM = 10;

export type CartAction =
  | { type: "hydrate"; cart: Cart }
  | { type: "add"; item: Omit<CartItem, "quantity">; quantity: number }
  | { type: "remove"; productId: string }
  | { type: "setQuantity"; productId: string; quantity: number }
  | { type: "clear" };

export function createEmptyCart(): Cart {
  return { items: [], updatedAt: new Date(0).toISOString() };
}

function clampQuantity(quantity: number, maxQuantity: number): number {
  const limit = Math.min(maxQuantity, MAX_QUANTITY_PER_ITEM);
  return Math.max(0, Math.min(Math.floor(quantity), limit));
}

function touch(cart: Cart, items: CartItem[]): Cart {
  return { ...cart, items, updatedAt: new Date().toISOString() };
}

/** Lógica de carrito sin efectos secundarios: fácil de probar y de reutilizar. */
export function cartReducer(cart: Cart, action: CartAction): Cart {
  switch (action.type) {
    case "hydrate":
      return action.cart;
    case "add": {
      const existing = cart.items.find((item) => item.productId === action.item.productId);
      const quantity = clampQuantity((existing?.quantity ?? 0) + action.quantity, action.item.maxQuantity);
      if (quantity === 0) return cart;
      const items = existing
        ? cart.items.map((item) =>
            item.productId === action.item.productId ? { ...item, ...action.item, quantity } : item,
          )
        : [...cart.items, { ...action.item, quantity }];
      return touch(cart, items);
    }
    case "remove":
      return touch(
        cart,
        cart.items.filter((item) => item.productId !== action.productId),
      );
    case "setQuantity": {
      const items = cart.items
        .map((item) =>
          item.productId === action.productId
            ? { ...item, quantity: clampQuantity(action.quantity, item.maxQuantity) }
            : item,
        )
        .filter((item) => item.quantity > 0);
      return touch(cart, items);
    }
    case "clear":
      return touch(cart, []);
  }
}

export function getItemCount(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getSubtotal(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

/**
 * Costo de envío. El SRS no define tarifas de domicilio; se mantiene en 0 hasta
 * que el backend logístico las calcule (ver ESTADO.md).
 */
export function getShippingCost(): number {
  return 0;
}

export function getTotal(cart: Cart): number {
  return getSubtotal(cart) + getShippingCost();
}
