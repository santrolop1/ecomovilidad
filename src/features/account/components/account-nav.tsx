"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/cuenta", label: "Perfil" },
  { href: "/cuenta/pedidos", label: "Mis pedidos" },
  { href: "/cuenta/alquileres", label: "Mis alquileres" },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Mi cuenta" className="flex gap-2 overflow-x-auto">
      {items.map((item) => {
        const active = item.href === "/cuenta" ? pathname === "/cuenta" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center rounded-full border border-border px-4 text-sm transition-colors hover:border-ink/40",
              active && "border-ink bg-ink text-paper",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
