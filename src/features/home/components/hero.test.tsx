import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { branchesMock } from "@/mocks/branches";
import { homeContentMock } from "@/mocks/content";
import { Hero } from "./hero";

vi.mock("@/features/branches/components/service-map", () => ({ ServiceMap: () => null }));

describe("Hero", () => {
  it("identifica la disponibilidad de ejemplo y permite explorar las cuatro categorías", () => {
    render(<Hero content={homeContentMock.hero} branches={branchesMock} />);
    expect(screen.getByText("Disponibilidad de demostración")).toBeInTheDocument();
    expect(screen.queryByText("Disponible ahora")).not.toBeInTheDocument();
    const categories = screen.getByRole("list", { name: "Explorar por categoría" });
    expect(within(categories).getAllByRole("link")).toHaveLength(4);
    expect(within(categories).getByRole("link", { name: "Bicicletas" })).toHaveAttribute("href", "/catalogo?categoria=bicicletas");
  });

  it("no anuncia disponibilidad cuando una sucursal real está agotada", () => {
    const branch = { ...branchesMock[0], isDemo: false, inventory: [] };
    render(<Hero content={homeContentMock.hero} branches={[branch]} />);
    expect(screen.getByText("Consulta disponibilidad")).toBeInTheDocument();
    expect(screen.queryByText("Disponible ahora")).not.toBeInTheDocument();
  });
});
