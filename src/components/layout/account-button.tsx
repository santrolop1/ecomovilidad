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
  // Con sesión de administrador hay tres enlaces: entre lg y xl, junto al menú
  // principal, no caben con texto y se muestran solo con icono (el texto queda
  // para lectores de pantalla y como tooltip).
  const label = user.isAdmin ? "lg:sr-only xl:not-sr-only" : undefined;
  return (
    <>
      <Link href="/cuenta" className={linkClass} title="Mi cuenta">
        <UserRound className="size-4" aria-hidden="true" />
        <span className={label}>Mi cuenta</span>
      </Link>
      {user.isAdmin && (
        <Link href="/admin" className={linkClass} title="Panel">
          <LayoutDashboard className="size-4" aria-hidden="true" />
          <span className={label}>Panel</span>
        </Link>
      )}
      <button type="button" onClick={signOut} disabled={isPending} className={linkClass} title="Salir">
        <LogOut className="size-4" aria-hidden="true" />
        <span className={label}>
          Salir<span className="sr-only">, sesión de {user.firstName}</span>
        </span>
        <span className={user.isAdmin ? "text-foreground lg:hidden xl:inline" : "text-foreground"} aria-hidden="true">
          ({user.firstName})
        </span>
      </button>
    </>
  );
}
