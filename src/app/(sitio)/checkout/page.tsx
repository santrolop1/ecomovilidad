import { connection } from "next/server";
import { Container } from "@/components/shared/container";
import { CheckoutForm } from "@/features/checkout/components/checkout-form";
import { api, isRealApi } from "@/lib/api";
import { todayInBogota } from "@/lib/dates";
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
  const minDate = todayInBogota();
  const [branches, timeSlots] = await Promise.all([api.branches.listBranches(), api.rentals.listTimeSlots(minDate)]);

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="font-display mb-8 text-4xl sm:text-5xl">Finalizar compra</h1>
      <CheckoutForm branches={branches} timeSlots={timeSlots} minDate={minDate} requiresAccount={isRealApi} />
    </Container>
  );
}
