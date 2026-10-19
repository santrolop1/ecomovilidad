import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CustomerOrder } from "@/types";
import { OrderCard } from "./order-card";
import { OrderDetail } from "./order-detail";

// El botón de pago llama a una Server Action (solo servidor).
vi.mock("@/features/payments/actions", () => ({ startPayment: vi.fn() }));

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
  paymentExpiresAt: "2026-10-06T10:30:00-05:00",
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
    expect(screen.getByText("Pendiente de pago")).toBeInTheDocument();
    expect(screen.getByText(/1\.378\.000/)).toBeInTheDocument();
    expect(screen.getByText("Domicilio")).toBeInTheDocument();
    expect(screen.getByText("Cañaveral")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", `/cuenta/pedidos/${order.id}`);
  });

  it("el detalle no afirma un pago que no existe y ofrece pagar", () => {
    render(<OrderDetail order={order} />);
    expect(screen.getByText("Sin pagar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pagar ahora" })).toBeInTheDocument();
    expect(screen.queryByText(/aprobado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/factura/i)).not.toBeInTheDocument();
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

  it("un pedido pagado muestra el pago aprobado y la factura, sin botón de pago", () => {
    render(
      <OrderDetail
        order={{
          ...order,
          status: "paid",
          paymentExpiresAt: undefined,
          payment: { status: "approved", reference: "EMP-3F2A9C1B-AB12", paymentMethodType: "PSE", approvedAt: order.createdAt },
          invoice: { id: "inv-1", number: "EMV-000012", issuedAt: order.createdAt },
        }}
      />,
    );
    expect(screen.getByText("Pagado")).toBeInTheDocument();
    expect(screen.getByText("Aprobado")).toBeInTheDocument();
    expect(screen.getByText("PSE")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Factura PDF/ })).toHaveAttribute("href", "/api/facturas/inv-1/pdf");
    expect(screen.queryByRole("button", { name: /pagar/i })).not.toBeInTheDocument();
  });

  it("un pedido histórico sin pago en línea muestra el método que eligió", () => {
    render(<OrderDetail order={{ ...order, status: "cancelled", paymentExpiresAt: undefined, paymentMethod: "pse" }} />);
    expect(screen.getByText("Método elegido: PSE (sin pago en línea)")).toBeInTheDocument();
  });
});
