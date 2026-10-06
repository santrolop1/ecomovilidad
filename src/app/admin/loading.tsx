import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <span className="sr-only">Cargando…</span>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-11 w-full rounded-full" />
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
