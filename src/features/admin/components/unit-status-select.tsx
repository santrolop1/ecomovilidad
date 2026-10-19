"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type RentalUnitStatusValue, rentalUnitStatuses } from "@/lib/api/admin-schemas";
import { setRentalUnitStatus } from "../actions";
import { rentalUnitStatusLabels } from "../lib/labels";

/** Cambia el estado de una unidad de la flota. FastAPI impide retirar una unidad con alquileres vigentes. */
export function UnitStatusSelect({ unitId, code, status }: { unitId: string; code: string; status: RentalUnitStatusValue }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(value) =>
        startTransition(async () => {
          const result = await setRentalUnitStatus(unitId, value);
          if (result.ok) {
            toast.success(`${code}: ${rentalUnitStatusLabels[value as RentalUnitStatusValue].toLowerCase()}.`);
            router.refresh();
          } else {
            toast.error(result.message);
          }
        })
      }
    >
      <SelectTrigger aria-label={`Estado de ${code}`} className="w-full min-w-40 sm:w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {rentalUnitStatuses.map((value) => (
          <SelectItem key={value} value={value}>
            {rentalUnitStatusLabels[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
