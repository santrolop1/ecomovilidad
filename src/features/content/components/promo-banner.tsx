import Link from "next/link";
import type { Banner } from "@/types";
import { Container } from "@/components/shared/container";

/** Banner publicitario administrable (RF 1.1). */
export function PromoBanner({ banner }: { banner: Banner }) {
  return (
    <aside aria-label="Promoción" className="border-b border-line bg-volt text-ink">
      <Container className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          <strong className="font-semibold">{banner.title}.</strong> {banner.description}
        </p>
        <Link href={banner.cta.href} className="shrink-0 font-semibold underline underline-offset-4">
          {banner.cta.label}
        </Link>
      </Container>
    </aside>
  );
}
