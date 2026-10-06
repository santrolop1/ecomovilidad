"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  CalendarClock,
  FolderTree,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  Package,
  ReceiptText,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const adminNav: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: ReceiptText },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/inventario", label: "Inventario", icon: Boxes },
  { href: "/admin/categorias", label: "Categorías", icon: FolderTree },
  { href: "/admin/sucursales", label: "Sucursales", icon: MapPin },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/alquileres", label: "Alquileres", icon: CalendarClock },
];

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {adminNav.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] transition-colors",
                active ? "bg-paper/10 text-paper" : "text-muted-foreground hover:bg-paper/5 hover:text-paper",
              )}
            >
              <Icon className={cn("size-[1.1rem]", active && "text-volt")} aria-hidden="true" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
