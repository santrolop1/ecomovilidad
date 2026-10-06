import "server-only";
import { z } from "zod";
import { emptyToUndefined } from "./env";

/**
 * Variables de entorno de SERVIDOR. No llegan al navegador; aquí irán también
 * los secretos futuros (nunca con prefijo NEXT_PUBLIC_).
 */
const serverEnvSchema = z
  .object({
    apiMode: z.enum(["mock", "real"]).default("mock"),
    apiBaseUrl: z.url().optional(),
    mockLatencyMs: z.coerce.number().int().min(0).max(5000).default(0),
  })
  .refine((value) => value.apiMode !== "real" || value.apiBaseUrl, {
    message: "API_MODE=real requiere API_BASE_URL (p. ej. http://localhost:8000/api/v1).",
    path: ["apiBaseUrl"],
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

const parsed = serverEnvSchema.safeParse({
  apiMode: emptyToUndefined(process.env.API_MODE),
  apiBaseUrl: emptyToUndefined(process.env.API_BASE_URL),
  mockLatencyMs: emptyToUndefined(process.env.MOCK_LATENCY_MS),
});

if (!parsed.success) {
  throw new Error(`Variables de entorno de servidor inválidas: ${z.prettifyError(parsed.error)}`);
}

export const serverEnv: ServerEnv = parsed.data;
