import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Branch } from "@/types";

/** Resumen de puntos de servicio por ciudad (RF 1.2). */
export function ServicePoints({ branches }: { branches: Branch[] }) {
  const byCity = new Map<string, Branch[]>();
  for (const branch of branches) byCity.set(branch.city, [...(byCity.get(branch.city) ?? []), branch]);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-start">
      <div>
        <h2 id="puntos-title" className="font-display-tight text-3xl sm:text-[2.5rem]">
          Puntos de servicio
        </h2>
        <p className="mt-3 max-w-md text-[1.05rem] text-muted-foreground">
          Compra, recoge, devuelve o lleva tu vehículo al taller en {branches.length} sucursales.
        </p>
        <Button asChild size="xl" className="mt-8">
          <Link href="/sucursales">Ver mapa y horarios</Link>
        </Button>
      </div>
      <ul className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
        {[...byCity.entries()].map(([city, cityBranches]) => (
          <li key={city} className="bg-card p-5">
            <h3 className="font-display-tight text-xl">{city}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {cityBranches.map((branch) => (
                <li key={branch.id}>
                  <Link href={`/sucursales#${branch.slug}`} className="group flex justify-between gap-3">
                    <span className="group-hover:underline">{branch.name}</span>
                    <span className="text-muted-foreground">{branch.address}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
