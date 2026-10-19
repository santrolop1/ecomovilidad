import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RentalDetail } from "@/features/account/components/rental-detail";
import { api } from "@/lib/api";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Detalle del alquiler",
  description: "Unidad, horario, pago y factura de tu alquiler.",
  path: "/cuenta/alquileres",
  noIndex: true,
});

export default async function MyRentalPage({ params }: PageProps<"/cuenta/alquileres/[id]">) {
  const { id } = await params;
  // FastAPI responde 404 si el alquiler no existe o es de otro usuario.
  const rental = await api.rentals.getRental(id);
  if (!rental) notFound();
  return (
    <>
      <Link href="/cuenta/alquileres" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Mis alquileres
      </Link>
      <RentalDetail rental={rental} />
    </>
  );
}
