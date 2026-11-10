import { connection } from "next/server";
import { Container } from "@/components/shared/container";
import { CheckoutForm } from "@/features/checkout/components/checkout-form";
import { loadPaymentConfig } from "@/features/payments/lib/config";
import { api, isRealApi } from "@/lib/api";
import { addDays, todayInBogota } from "@/lib/dates";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Checkout",
  description: "Confirma tus datos, la entrega y el método de pago.",
  path: "/checkout",
  noIndex: true,
});

export default async function CheckoutPage() {
  // Página por solicitud: la fecha mínima y las franjas dependen del día.
  await connection();
  const today = todayInBogota();
  const [branches, todaySlots, paymentConfig] = await Promise.all([
    api.branches.listBranches(),
    api.rentals.listTimeSlots(today),
    loadPaymentConfig(),
  ]);
  // Pasada la última franja del día, se propone mañana en vez de un día sin cupo.
  const todayOpen = todaySlots.some((slot) => slot.available);
  const minDate = todayOpen ? today : addDays(today, 1);
  const timeSlots = todayOpen ? todaySlots : await api.rentals.listTimeSlots(minDate);

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="font-display mb-8 text-4xl sm:text-5xl">Finalizar compra</h1>
      <CheckoutForm
        branches={branches}
        timeSlots={timeSlots}
        minDate={minDate}
        requiresAccount={isRealApi}
        paymentConfig={paymentConfig}
      />
    </Container>
  );
}
