import { z } from "zod";
import { cartItemSchema } from "@/lib/api/schemas";
import type { Cart } from "@/types";

/** Clave versionada: si cambia el formato, se incrementa la versión. */
export const CART_STORAGE_KEY = "ecomovilidad:cart:v1";

const storedCartSchema = z.object({
  items: z.array(cartItemSchema).max(50),
  updatedAt: z.string(),
});

export interface CartStorage {
  load(): Cart | null;
  save(cart: Cart): void;
  clear(): void;
}

/**
 * Persistencia temporal en localStorage para visitantes. Solo guarda datos no
 * sensibles del carrito; cuando exista sesión, el carrito remoto (RF 6.3)
 * reemplaza a este almacenamiento.
 */
export function createLocalCartStorage(storage: Storage | undefined = globalThis.localStorage): CartStorage {
  return {
    load() {
      if (!storage) return null;
      try {
        const raw = storage.getItem(CART_STORAGE_KEY);
        if (!raw) return null;
        const parsed = storedCartSchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },
    save(cart) {
      try {
        storage?.setItem(CART_STORAGE_KEY, JSON.stringify({ items: cart.items, updatedAt: cart.updatedAt }));
      } catch {
        // Almacenamiento lleno o bloqueado (modo privado): el carrito sigue en memoria.
      }
    },
    clear() {
      try {
        storage?.removeItem(CART_STORAGE_KEY);
      } catch {
        // Ignorado intencionalmente.
      }
    },
  };
}
