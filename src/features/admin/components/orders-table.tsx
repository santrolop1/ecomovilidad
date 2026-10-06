import type { ReactNode } from "react";
import { formatCOP, formatDateTime, shortId } from "@/lib/format";
import type { AdminOrderSummary } from "@/lib/api/admin-schemas";
import { orderStatusLabels } from "../lib/labels";
import { type Column, DataTable } from "./data-table";
import { orderStatusTone, StatusBadge } from "@/components/shared/status-badge";

const columns: Column<AdminOrderSummary>[] = [
  { header: "Pedido", cell: (o) => <span className="tabular">{shortId(o.id)}</span> },
  { header: "Estado", cell: (o) => <StatusBadge tone={orderStatusTone[o.status]}>{orderStatusLabels[o.status]}</StatusBadge> },
  {
    header: "Cliente",
    cell: (o) => (
      <span className="block min-w-0">
        <span className="block truncate">{o.contactName}</span>
        <span className="block truncate text-xs text-muted-foreground">{o.userEmail}</span>
      </span>
    ),
  },
  {
    header: "Entrega",
    cell: (o) => (
      <span className="block">
        {o.fulfillmentMethod === "domicilio" ? "Domicilio" : "Recogida"}
        <span className="block text-xs text-muted-foreground">{o.branchName}</span>
      </span>
    ),
    hideOnMobile: true,
    className: "hidden xl:table-cell",
  },
  { header: "Unidades", cell: (o) => o.itemCount, numeric: true, className: "hidden lg:table-cell" },
  { header: "Total", cell: (o) => formatCOP(o.total), numeric: true },
  { header: "Creado", cell: (o) => formatDateTime(o.createdAt), className: "whitespace-nowrap" },
];

/** Versión resumida para el dashboard (columna más angosta). */
const compactColumns = columns.filter((c) => ["Pedido", "Estado", "Cliente", "Total"].includes(c.header));

export function OrdersTable({ orders, empty, compact = false }: { orders: AdminOrderSummary[]; empty: ReactNode; compact?: boolean }) {
  return (
    <DataTable
      rows={orders}
      columns={compact ? compactColumns : columns}
      rowKey={(o) => o.id}
      rowHref={(o) => `/admin/pedidos/${o.id}`}
      caption="Pedidos"
      empty={empty}
    />
  );
}
