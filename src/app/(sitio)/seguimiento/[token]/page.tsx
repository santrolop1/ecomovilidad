import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Container } from "@/components/shared/container";
import { TrackingLive } from "@/features/deliveries/components/tracking-live";
import { api } from "@/lib/api";

export const metadata: Metadata = { title: "Seguimiento de domicilio", robots: { index: false, follow: false } };

export default async function TrackingPage({ params }: PageProps<"/seguimiento/[token]">) {
  await connection();
  const { token } = await params;
  const tracking = await api.orders.getTracking(token);
  if (!tracking) notFound();
  return (
    <Container className="py-10 sm:py-14">
      <TrackingLive token={token} initial={tracking} />
    </Container>
  );
}
