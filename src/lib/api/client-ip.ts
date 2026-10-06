/**
 * IP del navegador a partir de las cabeceras que recibió Next.js.
 *
 * Detrás de Cloudflare (túnel de la demo pública) `CF-Connecting-IP` la fija
 * Cloudflare y el cliente no puede falsearla. En `X-Forwarded-For` cada proxy
 * añade la IP al final, y lo que hay a la izquierda lo puede escribir el propio
 * cliente: por eso se toma la última entrada y nunca la primera.
 */
export function clientIpFromHeaders(headers: Pick<Headers, "get">): string | null {
  const cloudflare = headers.get("cf-connecting-ip")?.trim();
  if (cloudflare) return cloudflare;
  const forwarded = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .at(-1);
  return forwarded ?? headers.get("x-real-ip")?.trim() ?? null;
}
