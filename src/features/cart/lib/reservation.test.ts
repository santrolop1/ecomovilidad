import { describe, expect, it } from "vitest";
import type { CartItem } from "@/types";
import { formatCountdown, reservationState, secondsLeft, toLocalClock, vanishedItems } from "./reservation";

const now = new Date("2026-10-06T10:00:00Z").getTime();
const item = (productId: string, minutes?: number): CartItem => ({
  productId,
  slug: productId,
  name: `Producto ${productId}`,
  brand: "M",
  unitPrice: 1000,
  quantity: 1,
  maxQuantity: 5,
  reservedUntil: minutes === undefined ? undefined : new Date(now + minutes * 60_000).toISOString(),
});

describe("reserva temporal en el cliente", () => {
  it("formatea el tiempo restante", () => {
    expect(formatCountdown(872)).toBe("14:32");
    expect(formatCountdown(5)).toBe("0:05");
    expect(formatCountdown(-3)).toBe("0:00");
  });

  it("calcula segundos restantes sin valores negativos", () => {
    expect(secondsLeft(item("a", 15).reservedUntil, now)).toBe(900);
    expect(secondsLeft(item("a", -1).reservedUntil, now)).toBe(0);
    expect(secondsLeft(undefined, now)).toBe(0);
  });

  it("carrito local o vacío: sin reserva", () => {
    expect(reservationState({ items: [] }, now)).toEqual({ kind: "none" });
    expect(reservationState({ items: [item("a")] }, now)).toEqual({ kind: "none" });
  });

  it("la reserva más próxima a vencer manda", () => {
    const state = reservationState({ items: [item("a", 10), item("b", 3)] }, now);
    expect(state).toMatchObject({ kind: "active", secondsLeft: 180 });
  });

  it("checkout bloqueado si alguna reserva venció", () => {
    const state = reservationState({ items: [item("a", 10), item("b", 0)] }, now);
    expect(state).toEqual({ kind: "expired", items: ["Producto b"] });
  });

  it("detecta productos retirados por vencimiento, no los quitados por el usuario", () => {
    const before = [item("a", 1), item("b", 1), item("c", 1)];
    const after = [item("c", 1)];
    expect(vanishedItems(before, after, new Set(["b"]))).toEqual(["Producto a"]);
    // Carrito vacío tras la expiración: todos los productos se informan.
    expect(vanishedItems(before, [], new Set())).toEqual(["Producto a", "Producto b", "Producto c"]);
  });
});

describe("corrección de reloj", () => {
  it("ajusta los vencimientos si el reloj del navegador va adelantado", () => {
    const serverNow = new Date("2026-10-06T10:00:00Z").getTime();
    const cart = {
      items: [item("a", 15)],
      updatedAt: "",
      serverTime: new Date(serverNow).toISOString(),
    };
    // El navegador marca 30 s más que el servidor.
    const local = toLocalClock(cart, serverNow + 30_000);
    expect(secondsLeft(local.items[0].reservedUntil, serverNow + 30_000)).toBe(900);
  });
});
