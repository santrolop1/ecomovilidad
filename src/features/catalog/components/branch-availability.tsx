import Link from "next/link";
import type { Branch, BranchStock } from "@/types";

interface BranchAvailabilityProps {
  stock: BranchStock[];
  branches: Branch[];
}

/** Disponibilidad por sucursal (RF 1.2 / RF 6.2). */
export function BranchAvailability({ stock, branches }: BranchAvailabilityProps) {
  const rows = branches.map((branch) => ({
    branch,
    quantity: stock.find((entry) => entry.branchId === branch.id)?.quantity ?? 0,
  }));

  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">
      {rows.map(({ branch, quantity }) => (
        <li key={branch.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
          <Link href={`/sucursales#${branch.slug}`} className="hover:underline">
            {branch.city}, {branch.name}
          </Link>
          <span className={quantity > 0 ? "tabular font-medium" : "text-muted-foreground"}>
            {quantity > 0 ? `${quantity} ${quantity === 1 ? "unidad" : "unidades"}` : "Sin unidades"}
          </span>
        </li>
      ))}
    </ul>
  );
}
