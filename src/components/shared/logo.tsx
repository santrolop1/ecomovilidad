import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Texto de la marca visible junto al símbolo. */
  withWordmark?: boolean;
}

/** Símbolo: una ruta que conecta dos puntos de servicio. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="var(--volt)" />
      <path
        d="M9 22.5c0-3.6 2.9-5.5 7-5.5s7-1.9 7-5.5"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="9" cy="22.5" r="2.6" fill="var(--ink)" />
      <circle cx="23" cy="11.5" r="2.6" fill="var(--ink)" />
    </svg>
  );
}

export function Logo({ className, withWordmark = true }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5 rounded-md", className)}
      aria-label="EcoMovilidad, ir al inicio"
    >
      <LogoMark />
      {withWordmark && (
        <span className="font-display-tight text-[1.15rem]" aria-hidden="true">
          EcoMovilidad
        </span>
      )}
    </Link>
  );
}
