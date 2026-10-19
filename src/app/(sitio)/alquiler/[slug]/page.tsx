import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/shared/container";
import { getSessionUser } from "@/features/auth/actions";
import { loadPaymentConfig } from "@/features/payments/lib/config";
import { RentalBookingForm } from "@/features/rentals/components/rental-booking-form";
import { api } from "@/lib/api";
import { todayInBogota } from "@/lib/dates";
import { createPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/alquiler/[slug]">) {
  const { slug } = await params;
  const offer = (await api.rentals.listOffers()).find((o) => o.slug === slug);
  return createPageMetadata({
    title: offer ? `Alquilar ${offer.name}` : "Alquiler",
    description: offer?.shortDescription ?? "Reserva de alquiler.",
    path: `/alquiler/${slug}`,
    noIndex: true,
  });
}

export default async function RentalBookingPage({ params }: PageProps<"/alquiler/[slug]">) {
  const { slug } = await params;
  const [offers, user, paymentConfig] = await Promise.all([api.rentals.listOffers(), getSessionUser(), loadPaymentConfig()]);
  const offer = offers.find((o) => o.slug === slug);
  if (!offer) notFound();
  return (
    <Container className="space-y-8 py-10 sm:py-14">
      <div className="space-y-3">
        <Link href="/alquiler" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden="true" />
          Alquiler
        </Link>
        <h1 className="font-display text-3xl sm:text-5xl">Alquilar {offer.name}</h1>
        <p className="max-w-2xl text-muted-foreground">{offer.shortDescription}</p>
      </div>
      <RentalBookingForm offer={offer} user={user} minDate={todayInBogota()} paymentConfig={paymentConfig} />
    </Container>
  );
}
