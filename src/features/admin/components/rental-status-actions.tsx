"use client";

import type { RentalStatusValue } from "@/lib/api/admin-schemas";
import { changeRentalStatus } from "../actions";
import { rentalActionHints, rentalActionLabels, rentalStatusLabels } from "../lib/labels";
import { ConfirmAction } from "./confirm-action";

export function RentalStatusActions({ rentalId, transitions }: { rentalId: string; transitions: RentalStatusValue[] }) {
  if (transitions.length === 0) {
    return <p className="text-sm text-muted-foreground">Estado final: no admite más cambios.</p>;
  }
  const ordered = [...transitions].sort((a, b) => Number(a === "cancelled") - Number(b === "cancelled"));
  return (
    <div className="flex flex-wrap gap-2">
      {ordered.map((status) => (
        <ConfirmAction
          key={status}
          label={rentalActionLabels[status]}
          title={`${rentalActionLabels[status]}?`}
          description={rentalActionHints[status]}
          confirmLabel={rentalActionLabels[status]}
          successMessage={`Alquiler ${rentalStatusLabels[status].toLowerCase()}.`}
          variant={status === "cancelled" ? "outline" : "brand"}
          destructive={status === "cancelled"}
          action={() => changeRentalStatus(rentalId, status)}
        />
      ))}
    </div>
  );
}
