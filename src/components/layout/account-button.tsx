"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { useTransition } from "react";
import { logout } from "@/features/auth/actions";
import { sessionQueryKey, useSession } from "@/features/auth/use-session";
import { cartQueryKey } from "@/features/cart/cart-provider";

/** Cierra sesión en FastAPI, borra cookies y limpia los datos de usuario en caché. */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return {
    isPending,
    logout: () =>
      startTransition(async () => {
        await logout();
        queryClient.setQueryData(sessionQueryKey, null);
        queryClient.removeQueries({ queryKey: cartQueryKey });
        router.refresh();
      }),
  };
}

const linkClass =
  "hidden items-center gap-2 rounded-full px-3.5 py-2 text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex";

export function AccountButton() {
  const { user } = useSession();
  const { logout: signOut, isPending } = useLogout();

  if (!user) {
    return (
      <Link href="/login" className={linkClass}>
        <UserRound className="size-4" aria-hidden="true" />
        Ingresar
      </Link>
    );
  }
  return (
    <>
      <Link href="/cuenta" className={linkClass}>
        <UserRound className="size-4" aria-hidden="true" />
        Mi cuenta
      </Link>
      {user.isAdmin && (
        <Link href="/admin" className={linkClass}>
          <LayoutDashboard className="size-4" aria-hidden="true" />
          Panel
        </Link>
      )}
    <button type="button" onClick={signOut} disabled={isPending} className={linkClass}>
      <LogOut className="size-4" aria-hidden="true" />
      <span>
        Salir<span className="sr-only">, sesión de {user.firstName}</span>
      </span>
      <span className="text-foreground" aria-hidden="true">
        ({user.firstName})
      </span>
    </button>
    </>
  );
}
