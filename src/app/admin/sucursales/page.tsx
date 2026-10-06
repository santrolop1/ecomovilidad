import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { serviceLabels } from "@/features/admin/lib/labels";
import { adminApi } from "@/lib/api/admin";
import { getAdminUser } from "@/features/admin/lib/guard";

export const metadata = { title: "Sucursales" };

export default async function AdminBranchesPage() {
  if (!(await getAdminUser())) return null;
  const branches = await adminApi.listBranches();
  return (
    <>
      <AdminPageHeader
        title="Sucursales"
        description="Bucaramanga, Floridablanca, Girón y Piedecuesta. Las marcadas como demo no corresponden a puntos reales."
        actions={
          <Button asChild variant="brand" size="xl">
            <Link href="/admin/sucursales/nueva">
              <Plus data-icon="inline-start" aria-hidden="true" />
              Nueva sucursal
            </Link>
          </Button>
        }
      />
      {branches.length === 0 ? (
        <EmptyState icon={MapPin} title="Sin sucursales" description="Crea el primer punto de servicio." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {branches.map((b) => (
            <li key={b.id}>
              <Link href={`/admin/sucursales/${b.id}`} className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-ink/40">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{b.city}</p>
                    <h2 className="font-display-tight text-lg">{b.name}</h2>
                  </div>
                  <span className="flex flex-wrap gap-1">
                    <StatusBadge tone={b.isActive ? "success" : "neutral"}>{b.isActive ? "Activa" : "Inactiva"}</StatusBadge>
                    {b.isDemo && <StatusBadge tone="warning">Demo</StatusBadge>}
                  </span>
                </div>
                <p className="text-sm">{b.address}, {b.neighborhood}</p>
                <p className="text-xs text-muted-foreground">{b.services.map((s) => serviceLabels[s]).join(", ")}</p>
                <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-3 text-center text-sm">
                  <div><dt className="text-xs text-muted-foreground">Disponible</dt><dd className="tabular font-semibold">{b.available}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Reservado</dt><dd className="tabular font-semibold">{b.reserved}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Total</dt><dd className="tabular font-semibold">{b.total}</dd></div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
