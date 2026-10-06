import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** Ruta base y parámetros actuales (filtros) a conservar. */
  pathname: string;
  params: Record<string, string | undefined>;
}

export function Pagination({ page, pageSize, total, pathname, params }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const linkClass =
    "inline-flex h-10 items-center gap-1 rounded-full border border-border bg-card px-4 text-sm transition-colors hover:border-ink/40";

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="tabular text-muted-foreground">
        {from}–{to} de {total}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={href(page - 1)} className={linkClass} rel="prev">
              <ChevronLeft className="size-4" aria-hidden="true" />
              Anterior
            </Link>
          ) : (
            <span className={cn(linkClass, "pointer-events-none opacity-40")} aria-disabled="true">
              <ChevronLeft className="size-4" aria-hidden="true" />
              Anterior
            </span>
          )}
          <span className="tabular px-1 text-muted-foreground">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={href(page + 1)} className={linkClass} rel="next">
              Siguiente
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className={cn(linkClass, "pointer-events-none opacity-40")} aria-disabled="true">
              Siguiente
              <ChevronRight className="size-4" aria-hidden="true" />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
