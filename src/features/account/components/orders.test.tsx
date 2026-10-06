import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CustomerOrder } from "@/types";
import { OrderCard } from "./order-card";
import { OrderDetail } from "./order-detail";

const order: CustomerOrder = {
  id: "3f2a9c1b-0000-4000-8000-000000000000",
  status: "pending",
  subtotal: 1_378_000,
  shippingCost: 0,
  total: 1_378_000,
  createdAt: "2026-10-06T10:00:00-05:00",
  updatedAt: "2026-10-06T10:00:00-05:00",
  itemCount: 2,
  branchName: "Cañaveral",
  branchCity: "Floridablanca",
  branchAddress: "Carrera 25 # 30-15",
  fulfillmentMethod: "domicilio",
  deliveryAddress: "Calle 45 # 30-20",
  deliveryCity: "Floridablanca",
  scheduledDate: "2026-10-07",
  timeSlot: "slot-14",
  paymentMethod: "pse",
  contactName: "Ana Pérez",
  contactEmail: "ana@correo.com",
  contactPhone: "3001234567",
  items: [
    {
      productId: "p1",
      slug: "patinova-city-80",
      name: "Patinova City 80",
      imageUrl: "/images/products/patinova-city-80.webp",
      quantity: 2,
      unitPrice: 689_000,
      subtotal: 1_378_000,
    },
  ],
};

describe("Mis pedidos", () => {
  it("la tarjeta muestra número, estado, total, cantidad, entrega y sucursal", () => {
    render(<OrderCard order={order} />);
    expect(screen.getByRole("heading", { name: "Pedido #3F2A9C1B" })).toBeInTheDocument();
    expect(screen.getByText("Pendiente de confirmación")).toBeInTheDocument();
    expect(screen.getByText(/1\.378\.000/)).toBeInTheDocument();
    expect(screen.getByText("Domicilio")).toBeInTheDocument();
    expect(screen.getByText("Cañaveral")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", `/cuenta/pedidos/${order.id}`);
  });

  it("el detalle no afirma un pago que no existe", () => {
    render(<OrderDetail order={order} />);
    expect(screen.getByText("PSE")).toBeInTheDocument();
    expect(screen.getByText("Sin procesar: el pago en línea aún no está disponible.")).toBeInTheDocument();
    expect(screen.queryByText(/pago confirmado/i)).not.toBeInTheDocument();
    expect(screen.getByText("Calle 45 # 30-20, Floridablanca")).toBeInTheDocument();
    expect(screen.getByText("2:00 p. m. – 4:00 p. m.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Patinova City 80" })).toBeInTheDocument();
  });

  it("recogida muestra la sucursal y no una dirección de domicilio", () => {
    render(<OrderDetail order={{ ...order, fulfillmentMethod: "recogida", deliveryAddress: undefined, deliveryCity: undefined }} />);
    expect(screen.getByText("Recogida en sucursal")).toBeInTheDocument();
    expect(screen.getByText(/Cañaveral, Carrera 25 # 30-15/)).toBeInTheDocument();
  });
});
