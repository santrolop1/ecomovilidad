import type { Cart, CartItem } from "@/types";

/**
 * Utilidades de la reserva temporal (RF 6.2) en el cliente. Son solo
 * informativas: el servidor decide si una reserva sigue vigente.
 */

/** Segundos restantes hasta `until` (nunca negativo). */
export function secondsLeft(until: string | undefined, now: number = Date.now()): number {
  if (!until) return 0;
  return Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000));
}

/** 872 → "14:32" */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export type ReservationState =
  | { kind: "none" } // carrito local o vacío: no hay reserva
  | { kind: "active"; secondsLeft: number; expiresAt: string }
  | { kind: "expired"; items: string[] };

/** Estado del carrito remoto para el checkout: la reserva más próxima a vencer manda. */
export function reservationState(cart: Pick<Cart, "items">, now: number = Date.now()): ReservationState {
  const reserved = cart.items.filter((item) => item.reservedUntil);
  if (reserved.length === 0) return { kind: "none" };
  const expired = reserved.filter((item) => secondsLeft(item.reservedUntil, now) === 0);
  if (expired.length > 0) return { kind: "expired", items: expired.map((item) => item.name) };
  const first = reserved.reduce((a, b) => (new Date(a.reservedUntil!) < new Date(b.reservedUntil!) ? a : b));
  return { kind: "active", secondsLeft: secondsLeft(first.reservedUntil, now), expiresAt: first.reservedUntil! };
}

/**
 * Lleva los vencimientos del reloj del servidor al del navegador:
 * vencimiento_local = vencimiento_servidor − (hora_servidor − hora_local_al_recibir).
 */
export function toLocalClock(cart: Cart, receivedAt: number): Cart {
  if (!cart.serverTime) return cart;
  const offset = new Date(cart.serverTime).getTime() - receivedAt;
  if (Math.abs(offset) < 1000) return cart;
  return {
    ...cart,
    items: cart.items.map((item) =>
      item.reservedUntil
        ? { ...item, reservedUntil: new Date(new Date(item.reservedUntil).getTime() - offset).toISOString() }
        : item,
    ),
  };
}

/**
 * Productos que desaparecieron del carrito sin que el usuario los quitara:
 * su reserva venció y el servidor los retiró.
 */
export function vanishedItems(previous: CartItem[], next: CartItem[], removedByUser: Set<string>): string[] {
  const still = new Set(next.map((item) => item.productId));
  return previous
    .filter((item) => !still.has(item.productId) && !removedByUser.has(item.productId))
    .map((item) => item.name);
}
