import { describe, expect, it } from "vitest";
import type { CartItem } from "@/types";
import { cartReducer, createEmptyCart, getItemCount, getSubtotal, MAX_QUANTITY_PER_ITEM } from "./cart-reducer";

const item: Omit<CartItem, "quantity"> = {
  productId: "p1",
  slug: "p1",
  name: "Producto 1",
  brand: "Marca",
  image: { src: "/x.svg", alt: "x" },
  unitPrice: 100_000,
  maxQuantity: 3,
};

describe("cartReducer", () => {
  it("agrega un producto nuevo", () => {
    const cart = cartReducer(createEmptyCart(), { type: "add", item, quantity: 2 });
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(2);
  });

  it("acumula cantidades sin superar el inventario disponible", () => {
    let cart = cartReducer(createEmptyCart(), { type: "add", item, quantity: 2 });
    cart = cartReducer(cart, { type: "add", item, quantity: 5 });
    expect(cart.items[0].quantity).toBe(3);
  });

  it("respeta el máximo por producto aunque haya más inventario", () => {
    const cart = cartReducer(createEmptyCart(), { type: "add", item: { ...item, maxQuantity: 99 }, quantity: 50 });
    expect(cart.items[0].quantity).toBe(MAX_QUANTITY_PER_ITEM);
  });

  it("no agrega productos sin inventario", () => {
    const cart = cartReducer(createEmptyCart(), { type: "add", item: { ...item, maxQuantity: 0 }, quantity: 1 });
    expect(cart.items).toHaveLength(0);
  });

  it("cambia la cantidad y elimina la línea al llegar a cero", () => {
    let cart = cartReducer(createEmptyCart(), { type: "add", item, quantity: 2 });
    cart = cartReducer(cart, { type: "setQuantity", productId: "p1", quantity: 1 });
    expect(cart.items[0].quantity).toBe(1);
    cart = cartReducer(cart, { type: "setQuantity", productId: "p1", quantity: 0 });
    expect(cart.items).toHaveLength(0);
  });

  it("elimina y vacía el carrito", () => {
    let cart = cartReducer(createEmptyCart(), { type: "add", item, quantity: 1 });
    cart = cartReducer(cart, { type: "add", item: { ...item, productId: "p2", slug: "p2" }, quantity: 1 });
    cart = cartReducer(cart, { type: "remove", productId: "p1" });
    expect(cart.items.map((i) => i.productId)).toEqual(["p2"]);
    expect(cartReducer(cart, { type: "clear" }).items).toEqual([]);
  });

  it("calcula cantidad total y subtotal", () => {
    let cart = cartReducer(createEmptyCart(), { type: "add", item, quantity: 2 });
    cart = cartReducer(cart, { type: "add", item: { ...item, productId: "p2", unitPrice: 50_000 }, quantity: 1 });
    expect(getItemCount(cart)).toBe(3);
    expect(getSubtotal(cart)).toBe(250_000);
  });
});
