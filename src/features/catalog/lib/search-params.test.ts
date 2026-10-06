import { describe, expect, it } from "vitest";
import { catalogFiltersToSearchParams, countActiveFilters, parseCatalogSearchParams } from "./search-params";

describe("parseCatalogSearchParams", () => {
  it("convierte la URL en filtros tipados", () => {
    expect(
      parseCatalogSearchParams({
        q: " urbana ",
        categoria: "bicicletas",
        marca: "Voltra,Andina Cycles",
        precioMin: "1000000",
        orden: "precio-asc",
        spec_tipo: ["Urbana", "Plegable"],
      }),
    ).toEqual({
      query: "urbana",
      category: "bicicletas",
      brands: ["Voltra", "Andina Cycles"],
      minPrice: 1_000_000,
      sort: "precio-asc",
      specs: { tipo: ["Urbana", "Plegable"] },
    });
  });

  it("ignora valores inválidos en lugar de fallar", () => {
    expect(parseCatalogSearchParams({ categoria: "motos", precioMin: "abc", orden: "random" })).toEqual({});
  });

  it("limita la longitud de la búsqueda", () => {
    expect(parseCatalogSearchParams({ q: "a".repeat(200) }).query).toHaveLength(80);
  });

  it("es reversible", () => {
    const filters = parseCatalogSearchParams({ categoria: "drones", marca: "Nimbo", spec_camara: "4K", orden: "nombre" });
    const roundTrip = parseCatalogSearchParams(Object.fromEntries(catalogFiltersToSearchParams(filters)));
    expect(roundTrip).toEqual(filters);
    expect(countActiveFilters(filters)).toBe(3);
  });
});
