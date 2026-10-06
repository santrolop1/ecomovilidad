import { describe, expect, it } from "vitest";
import { changePasswordSchema, profileSchema, resetConfirmSchema, safeNextPath } from "./schemas";

describe("formularios de cuenta", () => {
  it("perfil: solo datos personales; documento opcional", () => {
    const parsed = profileSchema.parse({ firstName: " Ana ", lastName: "Pérez", phone: "3001234567", documentNumber: "", isAdmin: true });
    expect(parsed).toEqual({ firstName: "Ana", lastName: "Pérez", phone: "3001234567", documentNumber: "" });
  });

  it("contraseña nueva segura y confirmada", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "corta", confirmPassword: "corta" }).success).toBe(false);
    expect(
      changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "clave-segura-1", confirmPassword: "otra-clave-1" }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "clave-segura-1", confirmPassword: "clave-segura-1" }).success,
    ).toBe(true);
  });

  it("recuperación exige un token", () => {
    expect(resetConfirmSchema.safeParse({ token: "", newPassword: "clave-segura-1", confirmPassword: "clave-segura-1" }).success).toBe(false);
  });

  it("redirecciones solo internas", () => {
    expect(safeNextPath("/cuenta/pedidos")).toBe("/cuenta/pedidos");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
  });
});
