import Link from "next/link";
import type { ReactNode } from "react";
import { ProductImage } from "@/components/shared/product-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCOP, formatDate, formatDateTime, shortId } from "@/lib/format";
import type { CustomerOrder } from "@/types";
import { PaymentSection } from "@/features/payments/components/payment-section";
import { CancelRefund } from "./cancel-refund";
import { customerOrderStatus, paymentMethodLabels, timeSlotLabels } from "../lib/labels";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  );
}

export function OrderDetail({ order }: { order: CustomerOrder }) {
  const status = customerOrderStatus[order.status];
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display tabular text-3xl sm:text-4xl">Pedido {shortId(order.id)}</h1>
          <p className="mt-1 text-muted-foreground">Realizado el {formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </header>
      <p className="rounded-2xl border border-border bg-card p-4 text-sm">{status.help}</p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="productos" className="min-w-0 space-y-3">
          <h2 id="productos" className="font-display-tight text-xl">Productos</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {order.items.map((item) => (
              <li key={item.productId} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 p-4 sm:grid-cols-[80px_minmax(0,1fr)_auto] sm:items-center">
                <span className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                  <ProductImage image={item.imageUrl ? { src: item.imageUrl, alt: item.name } : undefined} sizes="80px" compact />
                </span>
                <div className="min-w-0">
                  <Link href={`/catalogo/${item.slug}`} className="font-medium hover:underline">
                    {item.name}
                  </Link>
                  <p className="tabular text-sm text-muted-foreground">
                    {item.quantity} × {formatCOP(item.unitPrice)}
                  </p>
                </div>
                <p className="tabular col-start-2 font-semibold sm:col-start-auto sm:text-right">{formatCOP(item.subtotal)}</p>
              </li>
            ))}
          </ul>
          <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular">{formatCOP(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Envío</dt><dd className="tabular">{formatCOP(order.shippingCost)}</dd></div>
            <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold"><dt>Total</dt><dd className="tabular">{formatCOP(order.total)}</dd></div>
          </dl>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="entrega" className="rounded-2xl border border-border bg-card p-5">
            <h2 id="entrega" className="font-display-tight text-lg">Entrega</h2>
            <dl className="mt-3 grid gap-3 text-sm">
              <Field label="Modalidad">{order.fulfillmentMethod === "domicilio" ? "Domicilio" : "Recogida en sucursal"}</Field>
              {order.fulfillmentMethod === "domicilio" ? (
                <Field label="Dirección">{order.deliveryAddress}, {order.deliveryCity}</Field>
              ) : (
                <Field label="Recoger en">{order.branchName}, {order.branchAddress} ({order.branchCity})</Field>
              )}
              {order.fulfillmentMethod === "domicilio" && <Field label="Despacha">{order.branchName} ({order.branchCity})</Field>}
              <Field label="Fecha">{formatDate(`${order.scheduledDate}T12:00:00-05:00`)}</Field>
              <Field label="Franja">{timeSlotLabels[order.timeSlot] ?? order.timeSlot}</Field>
            </dl>
          </section>
          <PaymentSection
            awaitingPayment={order.status === "pending"}
            expiresAt={order.paymentExpiresAt}
            payment={order.payment}
            invoice={order.invoice}
            target={{ orderId: order.id }}
            closedNote={order.paymentMethod ? `Método elegido: ${paymentMethodLabels[order.paymentMethod]} (sin pago en línea)` : undefined}
          />
          <CancelRefund
            kind="pedido"
            id={order.id}
            cancellable={order.status === "pending"}
            refundable={order.status === "paid"}
            refundRequest={order.refundRequest}
          />
          <section aria-labelledby="contacto" className="rounded-2xl border border-border bg-card p-5">
            <h2 id="contacto" className="font-display-tight text-lg">Contacto</h2>
            <dl className="mt-3 grid gap-3 text-sm">
              <Field label="Nombre">{order.contactName}</Field>
              <Field label="Correo">{order.contactEmail}</Field>
              <Field label="Teléfono">{order.contactPhone}</Field>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
