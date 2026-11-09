import { describe, expect, it } from "vitest";
import { isWompiCheckoutUrl, resolveCheckoutTarget } from "./checkout-url";

describe("destino del pago", () => {
  it("acepta el Web Checkout de Wompi", () => {
    const url = "https://checkout.wompi.co/p/?public-key=pub_test_x&reference=EMP-1";
    expect(isWompiCheckoutUrl(url)).toBe(true);
    expect(resolveCheckoutTarget(url)).toBe(url);
  });

  it("rechaza otros dominios, protocolos y rutas", () => {
    expect(isWompiCheckoutUrl("https://checkout.wompi.co.evil.com/p/")).toBe(false);
    expect(isWompiCheckoutUrl("http://checkout.wompi.co/p/")).toBe(false);
    expect(isWompiCheckoutUrl("https://checkout.wompi.co/otra")).toBe(false);
    expect(resolveCheckoutTarget("javascript:alert(1)")).toBeNull();
    expect(resolveCheckoutTarget("https://evil.com/pagar")).toBeNull();
    expect(resolveCheckoutTarget("no es una url")).toBeNull();
  });

  it("lleva la pasarela simulada al dominio actual", () => {
    expect(resolveCheckoutTarget("http://localhost:3000/pagos/simulador?referencia=EMP-1A2B-3C4D")).toBe(
      "/pagos/simulador?referencia=EMP-1A2B-3C4D",
    );
    expect(resolveCheckoutTarget("http://localhost:3000/pagos/manual?referencia=EMP-1")).toBe("/pagos/manual?referencia=EMP-1");
    expect(resolveCheckoutTarget("https://evil.com/pagos/simulador?referencia=EMP-1")).toBe("/pagos/simulador?referencia=EMP-1");
    expect(resolveCheckoutTarget("https://x.test/pagos/simulador?referencia=<script>")).toBeNull();
    expect(resolveCheckoutTarget("https://x.test/pagos/simulador")).toBeNull();
  });
});
