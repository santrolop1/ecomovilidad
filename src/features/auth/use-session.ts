"use client";

import { useQuery } from "@tanstack/react-query";
import type { User } from "@/types";
import { getSessionUser } from "./actions";

export const sessionQueryKey = ["session"] as const;

/** Sesión actual, cacheada por TanStack Query. */
export function useSession(): { user: User | null; isLoading: boolean } {
  const query = useQuery({ queryKey: sessionQueryKey, queryFn: () => getSessionUser(), staleTime: 5 * 60_000 });
  return { user: query.data ?? null, isLoading: query.isPending };
}
