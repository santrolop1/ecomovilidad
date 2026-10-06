import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { OrderDetail } from "@/features/account/components/order-detail";
import { api } from "@/lib/api";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Detalle del pedido",
  description: "Productos, entrega y estado de tu pedido.",
  path: "/cuenta/pedidos",
  noIndex: true,
});

export default async function MyOrderPage({ params }: PageProps<"/cuenta/pedidos/[id]">) {
  const { id } = await params;
  // FastAPI responde 404 si el pedido no existe o es de otro usuario.
  const order = await api.orders.getOrder(id);
  if (!order) notFound();
  return (
    <>
      <Link href="/cuenta/pedidos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Mis pedidos
      </Link>
      <OrderDetail order={order} />
    </>
  );
}
