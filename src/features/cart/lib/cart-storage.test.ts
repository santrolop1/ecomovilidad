import { describe, expect, it } from "vitest";
import { CART_STORAGE_KEY, createLocalCartStorage } from "./cart-storage";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

const validCart = {
  items: [
    {
      productId: "p1",
      slug: "p1",
      name: "Producto",
      brand: "Marca",
      image: { src: "/x.svg", alt: "x" },
      unitPrice: 1000,
      quantity: 1,
      maxQuantity: 2,
    },
  ],
  updatedAt: "2026-10-06T00:00:00.000Z",
};

describe("createLocalCartStorage", () => {
  it("guarda y recupera el carrito", () => {
    const storage = createLocalCartStorage(memoryStorage());
    storage.save(validCart);
    expect(storage.load()).toEqual(validCart);
  });

  it("ignora JSON corrupto", () => {
    const storage = createLocalCartStorage(memoryStorage({ [CART_STORAGE_KEY]: "{no-json" }));
    expect(storage.load()).toBeNull();
  });

  it("ignora datos con formato inválido", () => {
    const tampered = { items: [{ ...validCart.items[0], unitPrice: "gratis" }], updatedAt: "x" };
    const storage = createLocalCartStorage(memoryStorage({ [CART_STORAGE_KEY]: JSON.stringify(tampered) }));
    expect(storage.load()).toBeNull();
  });

  it("funciona sin almacenamiento disponible", () => {
    const storage = createLocalCartStorage(undefined);
    expect(storage.load()).toBeNull();
    expect(() => storage.save(validCart)).not.toThrow();
  });
});
