import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductImage } from "@/components/shared/product-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCOP, formatDateTime, shortId } from "@/lib/format";
import type { CustomerOrder } from "@/types";
import { customerOrderStatus } from "../lib/labels";

/** Resumen de un pedido para "Mis pedidos" (tarjeta en todos los anchos). */
export function OrderCard({ order }: { order: CustomerOrder }) {
  const status = customerOrderStatus[order.status];
  const previews = order.items.slice(0, 3);
  return (
    <article className="rounded-2xl border border-border bg-card transition-colors hover:border-ink/40">
      <Link href={`/cuenta/pedidos/${order.id}`} className="block p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display-tight tabular text-lg">Pedido {shortId(order.id)}</h2>
            <p className="text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
          </div>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex -space-x-3">
            {previews.map((item) => (
              <span key={item.productId} className="relative size-12 overflow-hidden rounded-xl border-2 border-card bg-muted sm:size-14">
                <ProductImage image={item.imageUrl ? { src: item.imageUrl, alt: "" } : undefined} sizes="56px" compact />
              </span>
            ))}
          </div>
          <p className="min-w-0 flex-1 truncate text-sm">
            {order.items.map((item) => item.name).join(", ")}
          </p>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Total</dt>
            <dd className="tabular font-semibold">{formatCOP(order.total)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Productos</dt>
            <dd className="tabular">{order.itemCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Entrega</dt>
            <dd>{order.fulfillmentMethod === "domicilio" ? "Domicilio" : "Recogida"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Sucursal</dt>
            <dd className="truncate">{order.branchName}</dd>
          </div>
        </dl>
        <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium">
          Ver detalle <ChevronRight className="size-4" aria-hidden="true" />
        </p>
      </Link>
    </article>
  );
}
