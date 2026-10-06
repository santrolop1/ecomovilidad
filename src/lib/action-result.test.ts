import { describe, expect, it } from "vitest";
import { z } from "zod";
import { runAction } from "./action-result";

describe("runAction", () => {
  it("devuelve errores por campo en esquemas de objeto", async () => {
    const result = await runAction(z.object({ name: z.string().min(2, "Corto") }), { name: "a" }, async () => null);
    expect(result).toEqual({ ok: false, message: "Revisa los campos marcados.", fieldErrors: { name: "Corto" } });
  });

  it("usa el mensaje de Zod en esquemas de un solo valor", async () => {
    const result = await runAction(z.number().min(0, "No puede ser negativo."), -1, async () => null);
    expect(result).toEqual({ ok: false, message: "No puede ser negativo." });
  });

  it("normaliza errores de la operación", async () => {
    const result = await runAction(z.number(), 1, async () => {
      throw new Error("detalle interno");
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).not.toContain("detalle interno");
  });
});
