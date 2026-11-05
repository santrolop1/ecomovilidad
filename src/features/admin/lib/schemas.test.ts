import { describe, expect, it } from "vitest";
import { toFieldErrors } from "@/lib/action-result";
import { branchFormSchema, productFormSchema, slugify, stockSchema, stockUpdateSchema } from "./schemas";

const product = {
  categoryId: "c1",
  name: "Bici",
  slug: "bici",
  sku: "bic-01",
  brand: "Marca",
  shortDescription: "Resumen",
  description: "Descripción",
  price: "1500000",
  compareAtPrice: "",
  imageUrl: "",
  highlights: [],
  specifications: [],
  isFeatured: false,
  isActive: true,
};

describe("formularios del panel", () => {
  it("producto: precio anterior e imagen vacíos se envían como null; SKU en mayúsculas", () => {
    const data = productFormSchema.parse(product);
    expect(data).toMatchObject({ price: 1_500_000, compareAtPrice: null, imageUrl: null, sku: "BIC-01" });
  });

  it("producto: el precio anterior debe superar al precio", () => {
    const result = productFormSchema.safeParse({ ...product, compareAtPrice: "1000" });
    expect(result.success).toBe(false);
    if (!result.success) expect(toFieldErrors(result.error)).toHaveProperty("compareAtPrice");
  });

  it("stock: nunca negativo ni decimal", () => {
    expect(stockSchema.safeParse("-1").success).toBe(false);
    expect(stockSchema.safeParse("2.5").success).toBe(false);
    expect(stockSchema.parse("12")).toBe(12);
  });

  it("ajuste de stock: exige un motivo", () => {
    expect(stockUpdateSchema.safeParse({ totalQuantity: "3", reason: " a " }).success).toBe(false);
    expect(stockUpdateSchema.parse({ totalQuantity: "3", reason: " Conteo físico " })).toEqual({
      totalQuantity: 3,
      reason: "Conteo físico",
    });
  });

  it("sucursal: solo municipios y coordenadas del área metropolitana", () => {
    const base = {
      slug: "giron-sur",
      name: "Girón Sur",
      address: "Calle 1 # 2-3",
      neighborhood: "Centro",
      city: "Girón",
      phone: "+57 607 000 0000",
      latitude: "7.06",
      longitude: "-73.17",
      openingHours: [{ days: "Lunes a viernes", opens: "08:00", closes: "18:00" }],
      services: ["venta"],
      slotCapacity: 6,
      isDemo: true,
      isActive: true,
    };
    expect(branchFormSchema.safeParse(base).success).toBe(true);
    expect(branchFormSchema.safeParse({ ...base, city: "Bogotá" }).success).toBe(false);
    expect(branchFormSchema.safeParse({ ...base, latitude: "4.6" }).success).toBe(false);
    const hours = branchFormSchema.safeParse({ ...base, openingHours: [{ days: "Sábados", opens: "18:00", closes: "08:00" }] });
    expect(hours.success).toBe(false);
  });

  it("slugify quita tildes y espacios", () => {
    expect(slugify("Kóndor Trail 29 ")).toBe("kondor-trail-29");
  });
});
