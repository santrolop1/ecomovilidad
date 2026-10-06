import { Container } from "@/components/shared/container";
import { CartView } from "@/features/cart/components/cart-view";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Carrito",
  description: "Revisa los productos de tu carrito antes de pagar.",
  path: "/carrito",
  noIndex: true,
});

export default function CartPage() {
  return (
    <Container className="py-10 sm:py-14">
      <h1 className="font-display mb-8 text-4xl sm:text-5xl">Carrito</h1>
      <CartView />
    </Container>
  );
}
