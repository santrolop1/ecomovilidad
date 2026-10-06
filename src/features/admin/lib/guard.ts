import "server-only";
import { cache } from "react";
import { getSessionUser } from "@/features/auth/actions";
import { isAdminAvailable } from "@/lib/api/admin";
import type { User } from "@/types";

/**
 * Usuario administrador de la solicitud actual (o null). Se memoriza por
 * solicitud: el layout y cada página lo consultan antes de pedir datos, así
 * nunca se llama al API administrativo sin sesión de administrador. FastAPI
 * vuelve a verificar el rol en cada endpoint.
 */
export const getAdminUser = cache(async (): Promise<User | null> => {
  if (!isAdminAvailable) return null;
  const user = await getSessionUser();
  return user?.isAdmin ? user : null;
});
