"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { Branch } from "@/types";
import { BRANCHES_REFRESH_MS, branchesQueryKey, fetchBranches } from "../lib/branches-query";
import { formatUpdatedAt } from "../lib/labels";
import { BranchCard } from "./branch-card";
import { type MapConfig, ServiceMap } from "./service-map";

interface BranchExplorerProps {
  initialBranches: Branch[];
  mapConfig: MapConfig;
}

/** Lista + mapa sincronizados. La disponibilidad se refresca periódicamente (RF 1.2). */
export function BranchExplorer({ initialBranches, mapConfig }: BranchExplorerProps) {
  const { data: branches, isError } = useQuery({
    queryKey: branchesQueryKey,
    queryFn: ({ signal }) => fetchBranches(signal),
    initialData: initialBranches,
    refetchInterval: BRANCHES_REFRESH_MS,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cities = new Set(branches.map((b) => b.city));
  const latestUpdate = branches.flatMap((b) => (b.inventoryUpdatedAt ? [b.inventoryUpdatedAt] : [])).sort().at(-1);

  const isStacked = () => window.matchMedia("(max-width: 1023px)").matches;

  // Al tocar un marcador se abre su popup (con enlace a la tarjeta). En móvil y
  // tablet el mapa va arriba: "Ver en el mapa" en una tarjeta sube hasta él.
  function selectFromList(branchId: string) {
    setSelectedId(branchId);
    if (isStacked()) document.getElementById("mapa-sucursales")?.scrollIntoView({ block: "start" });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,440px)] lg:gap-12">
      <div className="space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-muted-foreground">
          <p>
            {branches.length} sucursales en {cities.size} ciudades
          </p>
          <p aria-live="polite">
            {isError
              ? "Mostrando la última disponibilidad conocida."
              : latestUpdate && `Unidades disponibles por categoría, actualizado ${formatUpdatedAt(latestUpdate)}`}
          </p>
        </div>
        <ul className="grid gap-4 xl:grid-cols-2">
          {branches.map((branch) => (
            <li key={branch.id}>
              <BranchCard branch={branch} selected={selectedId === branch.id} onSelect={() => selectFromList(branch.id)} />
            </li>
          ))}
        </ul>
      </div>
      <div id="mapa-sucursales" className="order-first scroll-mt-20 lg:order-none">
        <div className="lg:sticky lg:top-24">
          <ServiceMap
            config={mapConfig}
            branches={branches}
            selectedId={selectedId}
            onSelect={setSelectedId}
            detailsHref={(branch) => `#${branch.slug}`}
            className="aspect-auto h-[min(68svh,520px)] lg:h-[calc(100svh-8rem)] lg:max-h-[760px]"
          />
        </div>
      </div>
    </div>
  );
}
