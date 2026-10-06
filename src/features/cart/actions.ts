"use server";

import { z } from "zod";
import { api, getErrorMessage } from "@/lib/api";
import type { ActionResult } from "@/lib/action-result";
import type { Cart } from "@/types";
import { MAX_QUANTITY_PER_ITEM } from "./lib/cart-reducer";

const idSchema = z.string().min(1).max(64);
const quantitySchema = z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM);
const linesSchema = z.array(z.object({ productId: idSchema, quantity: quantitySchema })).max(50);

async function cartResult(operation: () => Promise<Cart>): Promise<ActionResult<Cart>> {
  try {
    return { ok: true, data: await operation() };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function getRemoteCart(): Promise<ActionResult<Cart>> {
  return cartResult(() => api.cart.getCart());
}

export async function addRemoteCartItem(productId: string, quantity: number): Promise<ActionResult<Cart>> {
  return cartResult(() => api.cart.addItem(idSchema.parse(productId), quantitySchema.parse(quantity)));
}

export async function updateRemoteCartItem(itemId: string, quantity: number): Promise<ActionResult<Cart>> {
  return cartResult(() => api.cart.updateItem(idSchema.parse(itemId), quantitySchema.parse(quantity)));
}

export async function removeRemoteCartItem(itemId: string): Promise<ActionResult<Cart>> {
  return cartResult(() => api.cart.removeItem(idSchema.parse(itemId)));
}

export async function clearRemoteCart(): Promise<ActionResult<Cart>> {
  return cartResult(async () => {
    let cart = await api.cart.getCart();
    for (const item of cart.items) if (item.id) cart = await api.cart.removeItem(item.id);
    return cart;
  });
}

/**
 * Al iniciar sesión, sube los productos del carrito local que no estén ya en
 * el carrito de la cuenta. Las líneas sin inventario suficiente se omiten.
 */
export async function mergeLocalCart(lines: unknown): Promise<ActionResult<Cart>> {
  return cartResult(async () => {
    let cart = await api.cart.getCart();
    for (const line of linesSchema.parse(lines)) {
      if (cart.items.some((item) => item.productId === line.productId)) continue;
      try {
        cart = await api.cart.addItem(line.productId, line.quantity);
      } catch {
        // Producto agotado o inexistente: se descarta en silencio.
      }
    }
    return cart;
  });
}
