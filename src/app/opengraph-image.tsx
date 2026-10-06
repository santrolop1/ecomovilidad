import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/components/seo/og-card";

export const alt = "EcoMovilidad: movilidad eléctrica en Bucaramanga";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgCard
      eyebrow="Bicicletas, patinetas, patines y drones"
      title="Movilidad que se mueve contigo."
      footer="Bucaramanga y su área metropolitana"
    />,
    size,
  );
}
