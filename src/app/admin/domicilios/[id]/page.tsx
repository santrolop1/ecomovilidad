import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { timeSlotLabels } from "@/features/account/lib/labels";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { DeliveryActions } from "@/features/admin/components/delivery-actions";
import { getAdminUser } from "@/features/admin/lib/guard";
import { DeliveryTimeline } from "@/features/deliveries/components/delivery-timeline";
import { deliveryStatusLabels, deliveryStatusTone } from "@/features/deliveries/lib/labels";
import { adminApi } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/errors";
import { formatDate, formatDateTime, shortId } from "@/lib/format";

export const metadata = { title: "Detalle de domicilio" };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  );
}

export default async function AdminDeliveryPage({ params }: PageProps<"/admin/domicilios/[id]">) {
  if (!(await getAdminUser())) return null;
  const { id } = await params;
  const [delivery, couriers, drones] = await Promise.all([
    adminApi.getDelivery(id).catch((error: unknown) => {
      if (isApiError(error) && (error.code === "NOT_FOUND" || error.code === "VALIDATION_ERROR")) notFound();
      throw error;
    }),
    adminApi.listCouriers(),
    adminApi.listDeliveryDrones(),
  ]);
  const proofText =
    delivery.proofMethod === "qr"
      ? "Validada con el código del cliente."
      : delivery.proofMethod === "dron"
        ? delivery.customerConfirmedAt
          ? `El dron dejó el paquete a ${delivery.dropDistanceM} m del punto de entrega y el cliente confirmó que lo recibió.`
          : `El dron dejó el paquete a ${delivery.dropDistanceM} m del punto de entrega. El cliente no confirmó ni reclamó en 30 minutos.`
        : `Firmada por ${delivery.signerName}.`;

  return (
    <>
      <AdminPageHeader
        title={`Domicilio del pedido ${shortId(delivery.orderId)}`}
        description={`Actualizado el ${formatDateTime(delivery.updatedAt)}`}
        back={{ href: "/admin/domicilios", label: "Domicilios" }}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display-tight text-lg">Acciones</h2>
              <StatusBadge tone={deliveryStatusTone[delivery.status]}>{deliveryStatusLabels[delivery.status]}</StatusBadge>
            </div>
            <DeliveryActions key={delivery.updatedAt} delivery={delivery} couriers={couriers} drones={drones} />
          </section>
          {delivery.proofMethod && (
            <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display-tight text-lg">Prueba de entrega</h2>
              <p className="text-sm">{proofText}</p>
              {delivery.signatureImage && (
                // eslint-disable-next-line @next/next/no-img-element -- firma en línea guardada como PNG
                <img src={delivery.signatureImage} alt={`Firma de ${delivery.signerName}`} className="max-h-40 rounded-xl border border-border bg-white" />
              )}
            </section>
          )}
          {delivery.carrier === "dron" && delivery.destinationLatitude != null && (
            <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display-tight text-lg">Entrega con dron</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Field label="Punto de entrega">
                  <span className="tabular">
                    {delivery.destinationLatitude.toFixed(5)}, {delivery.destinationLongitude?.toFixed(5)}
                  </span>
                </Field>
                <Field label="Liberación del paquete">
                  {delivery.droppedAt ? (
                    <span className="tabular">
                      {formatDateTime(delivery.droppedAt)}, a {delivery.dropDistanceM} m del punto
                    </span>
                  ) : (
                    "Pendiente"
                  )}
                </Field>
                <Field label="Confirmación del cliente">
                  {delivery.customerConfirmedAt ? formatDateTime(delivery.customerConfirmedAt) : "Pendiente"}
                </Field>
              </dl>
            </section>
          )}
        </div>
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display-tight text-lg">Entrega</h2>
            <dl className="mt-3 grid gap-3 text-sm">
              <Field label="Cliente">{delivery.contactName}</Field>
              <Field label="Teléfono">{delivery.contactPhone}</Field>
              <Field label="Dirección">{delivery.deliveryAddress}, {delivery.deliveryCity}</Field>
              <Field label="Despacha">{delivery.branchName}</Field>
              <Field label="Fecha">{formatDate(`${delivery.scheduledDate}T12:00:00-05:00`)}</Field>
              <Field label="Franja">{timeSlotLabels[delivery.timeSlot] ?? delivery.timeSlot}</Field>
              <Field label={delivery.carrier === "dron" ? "Dron" : "Domiciliario"}>{delivery.courierName ?? "Sin asignar"}</Field>
              {delivery.failureReason && <Field label="Motivo del fallo">{delivery.failureReason}</Field>}
            </dl>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href={`/admin/pedidos/${delivery.orderId}`} className="underline">Ver pedido</Link>
              <Link href={`/seguimiento/${delivery.trackingToken}`} className="underline">Enlace del cliente</Link>
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-display-tight text-lg">Avance</h2>
            <DeliveryTimeline status={delivery.status} events={delivery.events} />
          </section>
        </div>
      </div>
    </>
  );
}
