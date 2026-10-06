import { Clock, MapPin, Phone } from "lucide-react";
import { categoryLabels } from "@/features/catalog/lib/labels";
import type { Branch } from "@/types";
import { cn } from "@/lib/utils";
import { branchServiceLabels } from "../lib/labels";

interface BranchCardProps {
  branch: Branch;
  selected: boolean;
  onSelect: () => void;
}

export function BranchCard({ branch, selected, onSelect }: BranchCardProps) {
  const headingId = `${branch.slug}-title`;
  return (
    <article
      id={branch.slug}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-24 rounded-2xl border bg-card p-5 transition-colors",
        selected ? "border-ink ring-1 ring-ink" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {branch.city}
            {branch.isDemo && (
              <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                Dato de demostración
              </span>
            )}
          </p>
          <h3 id={headingId} className="font-display-tight text-xl">
            {branch.name}
          </h3>
        </div>
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:border-ink/40 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
        >
          {selected ? "En el mapa" : "Ver en el mapa"}
        </button>
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        <li className="flex gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>
            {branch.address}, {branch.neighborhood}
          </span>
        </li>
        <li className="flex gap-2">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>
            {branch.hours.map((h) => (
              <span key={h.days} className="block">
                {h.days}: {h.opens} – {h.closes}
              </span>
            ))}
          </span>
        </li>
        <li className="flex gap-2">
          <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <a href={`tel:${branch.phone.replace(/\s/g, "")}`} className="hover:underline">
            {branch.phone}
          </a>
        </li>
      </ul>

      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Servicios disponibles">
        {branch.services.map((service) => (
          <li key={service} className="rounded-full bg-muted px-2.5 py-1 text-xs">
            {branchServiceLabels[service]}
          </li>
        ))}
      </ul>

      <dl className="mt-5 grid grid-cols-4 gap-2 border-t border-border pt-4 text-center">
        {branch.inventory.map((entry) => (
          <div key={entry.category}>
            <dt className="text-[0.7rem] text-muted-foreground">{categoryLabels[entry.category]}</dt>
            <dd className={cn("tabular mt-0.5 font-semibold", entry.available === 0 && "text-muted-foreground")}>
              {entry.available}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
