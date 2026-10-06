import { describe, expect, it } from "vitest";
import { branchesMock } from "@/mocks/branches";
import { clusterByCity, project } from "./geo";

describe("geo", () => {
  const bounds = { minLat: 0, maxLat: 10, minLng: -80, maxLng: -70 };

  it("proyecta las esquinas de la caja al lienzo", () => {
    expect(project({ lat: 10, lng: -80 }, bounds, 100, 200)).toEqual({ x: 0, y: 0 });
    expect(project({ lat: 0, lng: -70 }, bounds, 100, 200)).toEqual({ x: 100, y: 200 });
  });

  it("agrupa las sucursales de una misma ciudad", () => {
    const clusters = clusterByCity(branchesMock);
    const bucaramanga = clusters.find((c) => c.city === "Bucaramanga");
    expect(bucaramanga?.branchIds).toHaveLength(2);
    expect(clusters).toHaveLength(new Set(branchesMock.map((b) => b.city)).size);
  });
});
