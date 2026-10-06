/**
 * Inserta datos estructurados schema.org. Se escapa "<" para evitar inyección
 * de HTML (recomendación de la guía JSON-LD de Next.js).
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
