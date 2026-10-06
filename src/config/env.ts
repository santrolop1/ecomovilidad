import { z } from "zod";

/**
 * Variables de entorno PÚBLICAS (se incrustan en el bundle del navegador).
 * Nunca agregues aquí secretos: solo valores que cualquiera puede ver.
 *
 * Next.js solo incrusta `process.env.NEXT_PUBLIC_*` cuando se referencian de
 * forma literal, por eso cada variable se lee explícitamente.
 */
const publicEnvSchema = z.object({
  siteUrl: z.url().default("http://localhost:3000"),
  /**
   * La key de Maps JavaScript API es pública por diseño (la usa el navegador).
   * Debe restringirse por dominio (HTTP referrer) en Google Cloud.
   */
  googleMapsApiKey: z.string().min(1).optional(),
  googleMapsMapId: z.string().min(1).default("DEMO_MAP_ID"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function emptyToUndefined(value: string | undefined) {
  return value === undefined || value.trim() === "" ? undefined : value;
}

const parsed = publicEnvSchema.safeParse({
  siteUrl: emptyToUndefined(process.env.NEXT_PUBLIC_SITE_URL),
  googleMapsApiKey: emptyToUndefined(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
  googleMapsMapId: emptyToUndefined(process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID),
});

if (!parsed.success) {
  throw new Error(`Variables de entorno públicas inválidas: ${z.prettifyError(parsed.error)}`);
}

export const env: PublicEnv = parsed.data;
