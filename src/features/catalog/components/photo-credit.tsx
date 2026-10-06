import Link from "next/link";
import { findImageCredit } from "@/config/image-credits";

/** Atribución exigida por las licencias CC BY / CC BY-SA de las fotos. */
export function PhotoCredit({ src }: { src?: string }) {
  if (!src) {
    return <p className="mt-2 text-xs text-muted-foreground">Foto del producto pendiente.</p>;
  }
  const credit = findImageCredit(src);
  if (!credit) return null;
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      Foto referencial del tipo de producto: {credit.author},{" "}
      <a href={credit.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        Wikimedia Commons
      </a>{" "}
      ({credit.license}).{" "}
      <Link href="/creditos" className="underline underline-offset-2">
        Créditos
      </Link>
    </p>
  );
}
