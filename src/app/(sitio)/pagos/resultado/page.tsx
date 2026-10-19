import { redirect } from "next/navigation";
import { Container } from "@/components/shared/container";
import { FormAlert } from "@/components/shared/form-alert";
import { getSessionUser } from "@/features/auth/actions";
import { PaymentResultView } from "@/features/payments/components/payment-result-view";
import { api, isRealApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/api/errors";
import { createPageMetadata } from "@/lib/seo";
import type { PaymentResult } from "@/types";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Resultado del pago",
  description: "Estado del pago.",
  path: "/pagos/resultado",
  noIndex: true,
});

/**
 * Wompi redirige aquí con `?id=<transacción>`. El estado NO se toma de la URL:
 * el backend consulta la transacción a Wompi con la llave privada.
 */
export default async function PaymentResultPage({ searchParams }: PageProps<"/pagos/resultado">) {
  const { id } = await searchParams;
  const transactionId = typeof id === "string" && /^[A-Za-z0-9-]{3,64}$/.test(id) ? id : null;
  if (!isRealApi) redirect("/");
  const user = await getSessionUser();
  if (!user) {
    const next = transactionId ? `/pagos/resultado?id=${transactionId}` : "/cuenta/pedidos";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (!transactionId) {
    return (
      <Container className="py-12 sm:py-16">
        <FormAlert variant="error">No recibimos la referencia del pago. Revisa el estado en Mi cuenta.</FormAlert>
      </Container>
    );
  }
  const outcome = await loadResult(transactionId);
  return (
    <Container className="py-12 sm:py-16">
      {"error" in outcome ? (
        <FormAlert variant="error">{outcome.error}</FormAlert>
      ) : (
        <PaymentResultView result={outcome.result} canRetry={outcome.canRetry} />
      )}
    </Container>
  );
}

async function loadResult(transactionId: string): Promise<{ result: PaymentResult; canRetry: boolean } | { error: string }> {
  try {
    const result = await api.payments.verify(transactionId);
    const target = result.orderId
      ? await api.orders.getOrder(result.orderId)
      : result.rentalId
        ? await api.rentals.getRental(result.rentalId)
        : null;
    return { result, canRetry: target?.status === "pending" };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}
