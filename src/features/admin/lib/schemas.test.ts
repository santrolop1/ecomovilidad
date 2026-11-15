import { describe, expect, it } from "vitest";
import { toFieldErrors } from "@/lib/action-result";
import {
  bannerFormSchema,
  branchFormSchema,
  deliveryValidationSchema,
  droneAssignSchema,
  productFormSchema,
  rentalCheckInSchema,
  slugify,
  stockSchema,
  stockUpdateSchema,
  unitIntervalSchema,
} from "./schemas";

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

  it("banner: solo enlaces internos y fechas en orden", () => {
    const banner = {
      title: "Promo",
      description: "Descripción",
      ctaLabel: "Ver",
      ctaHref: "/catalogo",
      startsAt: "2026-11-01T08:00",
      endsAt: "2026-11-30T18:00",
      isActive: true,
    };
    expect(bannerFormSchema.parse(banner).startsAt).toBe("2026-11-01T08:00:00-05:00");
    for (const ctaHref of ["https://malo.example", "//malo.example", "javascript:alert(1)"]) {
      expect(bannerFormSchema.safeParse({ ...banner, ctaHref }).success).toBe(false);
    }
    expect(bannerFormSchema.safeParse({ ...banner, endsAt: "2026-10-01T08:00" }).success).toBe(false);
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

describe("domicilios con dron, salida y entrada, y revisión periódica", () => {
  it("exige un dron y un punto de entrega dentro del área metropolitana", () => {
    const ok = droneAssignSchema.safeParse({
      droneDeviceId: "4f0d8a4e-7d3b-4c47-9b1e-2a5f6c7d8e9f",
      destinationLatitude: "7.1193",
      destinationLongitude: "-73.1227",
    });
    expect(ok.success).toBe(true);
    const bogota = droneAssignSchema.safeParse({
      droneDeviceId: "4f0d8a4e-7d3b-4c47-9b1e-2a5f6c7d8e9f",
      destinationLatitude: "4.6097",
      destinationLongitude: "-74.0817",
    });
    expect(bogota.success).toBe(false);
    expect(droneAssignSchema.safeParse({ droneDeviceId: "", destinationLatitude: 7.1, destinationLongitude: -73.1 }).success).toBe(false);
  });

  it("acepta la evidencia del dron como prueba de entrega", () => {
    expect(deliveryValidationSchema.safeParse({ method: "dron" }).success).toBe(true);
  });

  it("anota el uso al recibir el vehículo y valida el plazo de revisión", () => {
    expect(rentalCheckInSchema.safeParse({ usage: "12.5" }).success).toBe(true);
    expect(rentalCheckInSchema.safeParse({ usage: "-1" }).success).toBe(false);
    expect(unitIntervalSchema.safeParse("90").success).toBe(true);
    expect(unitIntervalSchema.safeParse("0").success).toBe(false);
    expect(unitIntervalSchema.safeParse("1000").success).toBe(false);
  });
});
