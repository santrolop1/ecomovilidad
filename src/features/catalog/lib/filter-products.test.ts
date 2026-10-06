import { describe, expect, it } from "vitest";
import { productsMock } from "@/mocks/products";
import { queryProducts } from "./filter-products";

describe("queryProducts", () => {
  it("filtra por categoría", () => {
    const { items } = queryProducts(productsMock, { category: "drones" });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((p) => p.category === "drones")).toBe(true);
  });

  it("busca sin distinguir tildes ni mayúsculas", () => {
    const { items } = queryProducts(productsMock, { query: "KONDOR" });
    expect(items.map((p) => p.brand)).toContain("Kóndor");
  });

  it("filtra por marca, precio y especificación", () => {
    const { items } = queryProducts(productsMock, {
      category: "bicicletas",
      brands: ["Andina Cycles"],
      maxPrice: 2_000_000,
      specs: { asistencia: ["Mecánica"] },
    });
    expect(items.map((p) => p.slug)).toEqual(["andina-ruta-mecanica"]);
  });

  it("ordena por precio ascendente y descendente", () => {
    const asc = queryProducts(productsMock, { sort: "precio-asc" }).items.map((p) => p.price);
    const desc = queryProducts(productsMock, { sort: "precio-desc" }).items.map((p) => p.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(desc).toEqual([...asc].reverse());
  });

  it("deja los agotados al final en el orden por defecto", () => {
    const { items } = queryProducts(productsMock);
    const firstOut = items.findIndex((p) => p.stock.status === "out_of_stock");
    const lastIn = items.findLastIndex((p) => p.stock.status !== "out_of_stock" && !p.featured);
    expect(firstOut).toBeGreaterThan(lastIn);
  });

  it("calcula facetas de especificaciones solo dentro de una categoría", () => {
    expect(queryProducts(productsMock).facets.specs).toEqual([]);
    const { facets } = queryProducts(productsMock, { category: "drones" });
    expect(facets.specs.map((f) => f.key)).toEqual(expect.arrayContaining(["camara", "clase"]));
  });

  it("las facetas de marca ignoran el propio filtro de marca", () => {
    const { facets } = queryProducts(productsMock, { brands: ["Voltra"] });
    expect(facets.brands.length).toBeGreaterThan(1);
  });
});
