import { z } from "zod";
import { branchSchema } from "@/lib/api/schemas";
import type { Branch } from "@/types";

export const branchesQueryKey = ["branches"] as const;

/** Intervalo de refresco de la disponibilidad por sucursal en el navegador. */
export const BRANCHES_REFRESH_MS = 60_000;

/** Lee la disponibilidad desde el BFF (`/api/branches`). */
export async function fetchBranches(signal?: AbortSignal): Promise<Branch[]> {
  const response = await fetch("/api/branches", { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Error ${response.status} al consultar sucursales`);
  return z.array(branchSchema).parse(await response.json());
}
