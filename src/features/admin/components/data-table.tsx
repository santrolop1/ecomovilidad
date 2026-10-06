import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /** Alineación numérica a la derecha. */
  numeric?: boolean;
  /** Ocultar en la vista de tarjetas (móvil). */
  hideOnMobile?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Destino al pulsar la fila; la primera columna se convierte en enlace. */
  rowHref?: (row: T) => string;
  caption: string;
  empty: ReactNode;
}

/**
 * Tabla en escritorio y tablet; tarjetas en móvil (sin scroll horizontal).
 * La primera columna es el título de la tarjeta.
 */
export function DataTable<T>({ rows, columns, rowKey, rowHref, caption, empty }: DataTableProps<T>) {
  if (rows.length === 0) return <>{empty}</>;
  const [first, ...rest] = columns;
  const title = (row: T) =>
    rowHref ? (
      <Link href={rowHref(row)} className="font-medium hover:underline">
        {first.cell(row)}
      </Link>
    ) : (
      first.cell(row)
    );

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-border bg-muted/60 text-xs text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={cn("px-4 py-3 font-medium", column.numeric && "text-right", column.className)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="align-middle hover:bg-muted/40">
                <td className={cn("px-4 py-3", first.className)}>{title(row)}</td>
                {rest.map((column) => (
                  <td
                    key={column.header}
                    className={cn("px-4 py-3", column.numeric && "tabular text-right", column.className)}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-2xl border border-border bg-card p-4">
            <div className="text-[0.95rem]">{title(row)}</div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {rest
                .filter((column) => !column.hideOnMobile)
                .map((column) => (
                  <div key={column.header} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{column.header}</dt>
                    <dd className={cn("mt-0.5 break-words", column.numeric && "tabular")}>{column.cell(row)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
