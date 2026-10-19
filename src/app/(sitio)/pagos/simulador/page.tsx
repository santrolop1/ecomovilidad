import { notFound, redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Container } from "@/components/shared/container";
import { FormAlert } from "@/components/shared/form-alert";
import { getSessionUser } from "@/features/auth/actions";
import { SimulatorDecision } from "@/features/payments/components/simulator-decision";
import { api, isRealApi } from "@/lib/api";
import { formatCOP, formatDateTime } from "@/lib/format";
import { createPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Pasarela de pruebas",
  description: "Pago simulado, sin cobro real.",
  path: "/pagos/simulador",
  noIndex: true,
});

/**
 * Pasarela SIMULADA: reemplaza a Wompi mientras no haya llaves (solo en
 * desarrollo y demostraciones; el backend la desactiva en producción).
 */
export default async function PaymentSimulatorPage({ searchParams }: PageProps<"/pagos/simulador">) {
  const { referencia } = await searchParams;
  const reference = typeof referencia === "string" && /^[A-Za-z0-9-]{3,64}$/.test(referencia) ? referencia : null;
  if (!isRealApi || !reference) notFound();
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/pagos/simulador?referencia=${reference}`)}`);

  const simulation = await api.payments.getSimulation(reference);
  if (!simulation) notFound(); // otro usuario, referencia inexistente o Wompi activo

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-lg space-y-6 rounded-3xl border-2 border-dashed border-warning/60 bg-card p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <FlaskConical className="mt-1 size-7 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <h1 className="font-display-tight text-2xl">Pasarela de pruebas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pago <strong>simulado</strong>: no se cobra dinero real. EcoMovilidad está lista para Wompi y usará esta
              pasarela de pruebas hasta configurar sus llaves.
            </p>
          </div>
        </div>

        <dl className="grid gap-3 rounded-2xl bg-muted p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Concepto</dt>
            <dd className="text-right">{simulation.description}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Referencia</dt>
            <dd className="tabular break-all text-right">{simulation.reference}</dd>
          </div>
          {simulation.expiresAt && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Pagar antes de</dt>
              <dd className="text-right">{formatDateTime(simulation.expiresAt)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular">{formatCOP(simulation.amount)}</dd>
          </div>
        </dl>

        {simulation.status === "pending" ? (
          <SimulatorDecision reference={simulation.reference} />
        ) : (
          <FormAlert variant="info">Este pago ya se procesó. Revisa su estado en Mi cuenta.</FormAlert>
        )}
      </div>
    </Container>
  );
}
