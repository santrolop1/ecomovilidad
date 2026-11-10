import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { OrderStatusActions } from "@/features/admin/components/order-status-actions";
import { PaymentAttempts } from "@/features/admin/components/payment-attempts";
import { RefundRequestCard } from "@/features/admin/components/refund-request-card";
import { orderStatusTone, StatusBadge } from "@/components/shared/status-badge";
import { fulfillmentLabels, orderStatusLabels, paymentLabels } from "@/features/admin/lib/labels";
import { adminApi } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/errors";
import { formatCOP, formatDate, formatDateTime, shortId } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getAdminUser } from "@/features/admin/lib/guard";

export const metadata = { title: "Detalle de pedido" };

const slotLabels: Record<string, string> = {
  "slot-08": "8:00 a. m. – 10:00 a. m.",
  "slot-10": "10:00 a. m. – 12:00 m.",
  "slot-12": "12:00 m. – 2:00 p. m.",
  "slot-14": "2:00 p. m. – 4:00 p. m.",
  "slot-16": "4:00 p. m. – 6:00 p. m.",
};

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  );
}

export default async function AdminOrderPage({ params }: PageProps<"/admin/pedidos/[id]">) {
  if (!(await getAdminUser())) return null;
  const { id } = await params;
  const order = await adminApi.getOrder(id).catch((error: unknown) => {
    if (isApiError(error) && (error.code === "NOT_FOUND" || error.code === "VALIDATION_ERROR")) notFound();
    throw error;
  });

  return (
    <>
      <AdminPageHeader
        title={`Pedido ${shortId(order.id)}`}
        description={`Creado el ${formatDateTime(order.createdAt)}, actualizado el ${formatDateTime(order.updatedAt)}`}
        back={{ href: "/admin/pedidos", label: "Pedidos" }}
      />

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Estado actual</span>
          <StatusBadge tone={orderStatusTone[order.status]}>{orderStatusLabels[order.status]}</StatusBadge>
        </div>
        {order.deliveryId && order.status === "paid" ? (
          <p className="text-sm text-muted-foreground">
            Se completa al validar la entrega en <Link href={`/admin/domicilios/${order.deliveryId}`} className="underline">Domicilios</Link>.
          </p>
        ) : (
          <OrderStatusActions orderId={order.id} transitions={order.allowedTransitions} />
        )}
      </section>
      <p className="text-xs text-muted-foreground">
        No se guarda historial de cambios de estado: solo el estado actual y la fecha de la última actualización.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="productos" className="min-w-0 space-y-3">
          <h2 id="productos" className="font-display-tight text-lg">Productos</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {order.items.map((item) => (
              <li key={item.productId} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link href={`/admin/productos/${item.productId}`} className="font-medium hover:underline">
                    {item.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                </div>
                <p className="tabular text-sm">
                  {item.quantity} × {formatCOP(item.unitPrice)} = <span className="font-semibold">{formatCOP(item.subtotal)}</span>
                </p>
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
          <section aria-labelledby="cliente" className="rounded-2xl border border-border bg-card p-5">
            <h2 id="cliente" className="font-display-tight text-lg">Cliente</h2>
            <dl className="mt-3 grid gap-3 text-sm">
              <Field label="Nombre">{order.contactName}</Field>
              <Field label="Correo de contacto">{order.contactEmail}</Field>
              <Field label="Teléfono">{order.contactPhone}</Field>
              <Field label="Documento">{order.documentType} {order.documentNumber}</Field>
              <Field label="Cuenta">
                <Link href={`/admin/usuarios/${order.user.id}`} className="hover:underline">
                  {order.user.firstName} {order.user.lastName} ({order.user.email})
                </Link>
              </Field>
            </dl>
          </section>

          <section aria-labelledby="entrega" className="rounded-2xl border border-border bg-card p-5">
            <h2 id="entrega" className="font-display-tight text-lg">Entrega</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <Field label="Método">{fulfillmentLabels[order.fulfillmentMethod]}</Field>
              <Field label="Sucursal">{order.branchName}, {order.branchCity}</Field>
              {order.fulfillmentMethod === "domicilio" && (
                <Field label="Dirección" className="col-span-2">
                  {order.deliveryAddress}, {order.deliveryCity}
                </Field>
              )}
              <Field label="Fecha">{formatDate(`${order.scheduledDate}T12:00:00-05:00`)}</Field>
              <Field label="Franja">{slotLabels[order.timeSlot] ?? order.timeSlot}</Field>
              {order.paymentMethod && <Field label="Método elegido (histórico)">{paymentLabels[order.paymentMethod]}</Field>}
            </dl>
            {order.deliveryId && (
              <Link href={`/admin/domicilios/${order.deliveryId}`} className="mt-3 inline-block text-sm underline">
                Gestionar domicilio
              </Link>
            )}
          </section>
          {order.refundRequest && <RefundRequestCard kind="pedido" id={order.id} request={order.refundRequest} />}
          <PaymentAttempts payments={order.payments} invoice={order.invoice} expiresAt={order.paymentExpiresAt} />
        </div>
      </div>
    </>
  );
}
