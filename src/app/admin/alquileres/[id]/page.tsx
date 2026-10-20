import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { rentalStatusTone, StatusBadge } from "@/components/shared/status-badge";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { PaymentAttempts } from "@/features/admin/components/payment-attempts";
import { RefundRequestCard } from "@/features/admin/components/refund-request-card";
import { RentalStatusActions } from "@/features/admin/components/rental-status-actions";
import { getAdminUser } from "@/features/admin/lib/guard";
import { rentalStatusLabels } from "@/features/admin/lib/labels";
import { adminApi } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/errors";
import { formatCOP, formatDateTime, shortId } from "@/lib/format";

export const metadata = { title: "Detalle de alquiler" };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  );
}

export default async function AdminRentalPage({ params }: PageProps<"/admin/alquileres/[id]">) {
  if (!(await getAdminUser())) return null;
  const { id } = await params;
  const rental = await adminApi.getRental(id).catch((error: unknown) => {
    if (isApiError(error) && (error.code === "NOT_FOUND" || error.code === "VALIDATION_ERROR")) return null;
    throw error;
  });
  if (!rental) notFound();

  return (
    <>
      <AdminPageHeader
        title={`Alquiler ${shortId(rental.id)}`}
        description={`Creado el ${formatDateTime(rental.createdAt)}`}
        back={{ href: "/admin/alquileres", label: "Alquileres" }}
        actions={<StatusBadge tone={rentalStatusTone[rental.status]}>{rentalStatusLabels[rental.status]}</StatusBadge>}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="reserva" className="rounded-2xl border border-border bg-card p-5">
            <h2 id="reserva" className="font-display-tight text-lg">
              Reserva
            </h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Vehículo">{rental.productName}</Field>
              <Field label="Unidad">
                <span className="tabular">{rental.unitCode ?? "Sin unidad (anterior a la flota)"}</span>
              </Field>
              <Field label="Sucursal">{rental.branchName}</Field>
              <Field label="Total">
                <span className="tabular font-semibold">{formatCOP(rental.price)}</span>
              </Field>
              <Field label="Recoge">{formatDateTime(rental.startAt)}</Field>
              <Field label="Devuelve">{formatDateTime(rental.endAt)}</Field>
              <Field label="Cliente">
                {rental.userName} ({rental.userEmail})
              </Field>
            </dl>
          </section>
          <section aria-labelledby="acciones" className="rounded-2xl border border-border bg-card p-5">
            <h2 id="acciones" className="font-display-tight mb-3 text-lg">
              Acciones
            </h2>
            <RentalStatusActions rentalId={rental.id} transitions={rental.allowedTransitions} />
          </section>
        </div>
        <div className="space-y-6">
          {rental.refundRequest && <RefundRequestCard kind="alquiler" id={rental.id} request={rental.refundRequest} />}
          <PaymentAttempts payments={rental.payments} invoice={rental.invoice} />
        </div>
      </div>
    </>
  );
}
