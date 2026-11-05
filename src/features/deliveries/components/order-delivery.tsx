import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import type { CustomerDelivery } from "@/types";
import { deliveryStatusLabels, deliveryStatusTone } from "../lib/labels";
import { DeliveryTimeline } from "./delivery-timeline";

/** El dueño del pedido ve el avance y el código para recibir (CU-07, CU-08). */
export function OrderDelivery({ delivery }: { delivery: CustomerDelivery }) {
  return (
    <section aria-labelledby="domicilio" className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="domicilio" className="font-display-tight text-lg">Domicilio</h2>
        <StatusBadge tone={deliveryStatusTone[delivery.status]}>{deliveryStatusLabels[delivery.status]}</StatusBadge>
      </div>
      <DeliveryTimeline status={delivery.status} events={delivery.events} />
      {delivery.courierName && (
        <p className="text-sm">{delivery.status === "entregado" ? `Lo entregó ${delivery.courierName}.` : `Te lo lleva ${delivery.courierName}.`}</p>
      )}
      {delivery.failureReason && <p className="text-sm text-destructive">{delivery.failureReason}</p>}
      {delivery.confirmationCode && delivery.qrImage && (
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-sm font-medium">Muestra este código al recibir</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen SVG generada por el backend, en línea */}
          <img src={delivery.qrImage} alt={`Código QR de entrega ${delivery.confirmationCode}`} className="mx-auto mt-2 size-36 rounded bg-white p-1" />
          <p className="tabular mt-2 text-xl font-semibold tracking-widest">{delivery.confirmationCode}</p>
          <p className="mt-1 text-xs text-muted-foreground">Compártelo solo con el domiciliario, al recibir tu pedido.</p>
        </div>
      )}
      <Link href={`/seguimiento/${delivery.trackingToken}`} className="block text-sm underline">
        Abrir enlace de seguimiento
      </Link>
    </section>
  );
}
