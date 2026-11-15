import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import type { CustomerDelivery } from "@/types";
import { deliveryStatusLabels, deliveryStatusTone } from "../lib/labels";
import { ConfirmReceiptButton } from "./confirm-receipt-button";
import { DeliveryTimeline } from "./delivery-timeline";

/** El dueño del pedido ve el avance y el código para recibir (CU-07, CU-08). */
export function OrderDelivery({ orderId, delivery }: { orderId: string; delivery: CustomerDelivery }) {
  const byDrone = delivery.carrier === "dron";
  return (
    <section aria-labelledby="domicilio" className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="domicilio" className="font-display-tight text-lg">Domicilio</h2>
        <StatusBadge tone={deliveryStatusTone[delivery.status]}>{deliveryStatusLabels[delivery.status]}</StatusBadge>
      </div>
      <DeliveryTimeline status={delivery.status} events={delivery.events} />
      {byDrone && delivery.status !== "fallido" && (
        <p className="text-sm">
          {delivery.status === "entregado"
            ? "Lo entregó un dron de EcoMovilidad."
            : delivery.droppedAt
              ? `El dron dejó tu pedido a ${delivery.dropDistanceM} m del punto de entrega.`
              : "Te lo lleva un dron. Lo dejará en el punto de entrega acordado."}
        </p>
      )}
      {delivery.canConfirmReceipt && (
        <div className="space-y-2 rounded-xl border border-border p-4">
          <p className="text-sm font-medium">¿Ya tienes tu paquete?</p>
          <p className="text-xs text-muted-foreground">
            Confírmalo para cerrar la entrega. Si no lo encuentras, escríbenos antes de 30 minutos: pasado ese tiempo, la posición GPS del dron
            queda como prueba de entrega.
          </p>
          <ConfirmReceiptButton orderId={orderId} />
        </div>
      )}
      {!byDrone && delivery.courierName && (
        <p className="text-sm">{delivery.status === "entregado" ? `Lo entregó ${delivery.courierName}.` : `Te lo lleva ${delivery.courierName}.`}</p>
      )}
      {delivery.failureReason && <p className="text-sm text-destructive">{delivery.failureReason}</p>}
      {delivery.confirmationCode && delivery.qrImage && (
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-sm font-medium">Muestra este código al recibir</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen SVG generada por el backend, en línea */}
          <img src={delivery.qrImage} alt={`Código QR de entrega ${delivery.confirmationCode}`} className="mx-auto mt-2 size-36 rounded bg-white p-1" />
          <p className="tabular mt-2 text-xl font-semibold tracking-widest">{delivery.confirmationCode}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {byDrone ? "Si el operador te lo pide, compártelo para validar la entrega." : "Compártelo solo con el domiciliario, al recibir tu pedido."}
          </p>
        </div>
      )}
      <Link href={`/seguimiento/${delivery.trackingToken}`} className="block text-sm underline">
        Abrir enlace de seguimiento
      </Link>
    </section>
  );
}
