import { MapFallback } from "@/components/map/map-fallback";
import type { Branch } from "@/types";

/** Fallback del mapa público: las sucursales siguen accesibles como lista. */
export function BranchMapFallback({ branches, detailsHref }: { branches: Branch[]; detailsHref: (branch: Branch) => string }) {
  return (
    <MapFallback>
      <ul className="divide-y divide-border rounded-2xl border border-border text-sm">
        {branches.map((branch) => (
          <li key={branch.id}>
            <a href={detailsHref(branch)} className="block px-4 py-3 hover:bg-ink-3">
              <span className="block font-medium">
                {branch.city}, {branch.name}
              </span>
              <span className="block text-muted-foreground">{branch.address}</span>
            </a>
          </li>
        ))}
      </ul>
    </MapFallback>
  );
}
