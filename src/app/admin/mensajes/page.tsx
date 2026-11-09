import { Mail } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { contactTopics } from "@/features/contact/lib/schema";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { ContactStatusButton } from "@/features/admin/components/contact-status-button";
import { FilterBar } from "@/features/admin/components/filter-bar";
import { Pagination } from "@/features/admin/components/pagination";
import { getAdminUser } from "@/features/admin/lib/guard";
import { pageParam, param } from "@/features/admin/lib/params";
import { adminApi } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Mensajes" };

const topicLabels = new Map<string, string>(contactTopics.map((t) => [t.value, t.label]));

export default async function AdminMessagesPage({ searchParams }: PageProps<"/admin/mensajes">) {
  if (!(await getAdminUser())) return null;
  const params = await searchParams;
  const q = param(params, "q");
  const state = param(params, "state");
  const page = pageParam(params);
  const result = await adminApi.listContactMessages({ q, state, page });

  return (
    <>
      <AdminPageHeader title="Mensajes" description="Lo que los clientes escriben en el formulario de contacto." />
      <FilterBar
        action="/admin/mensajes"
        query={q}
        searchPlaceholder="Nombre, correo o texto"
        selects={[
          {
            name: "state",
            label: "Estado",
            value: state,
            options: [
              { value: "", label: "Todos" },
              { value: "nuevo", label: "Nuevos" },
              { value: "atendido", label: "Atendidos" },
            ],
          },
        ]}
      />
      {result.items.length === 0 ? (
        <EmptyState icon={Mail} title="No hay mensajes con ese filtro" description="Aparecen aquí cuando alguien escribe desde la página de contacto." />
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {result.items.map((m) => (
            <li key={m.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{m.fullName}</p>
                <StatusBadge tone={m.status === "nuevo" ? "warning" : "neutral"}>{m.status === "nuevo" ? "Nuevo" : "Atendido"}</StatusBadge>
              </div>
              <p className="text-sm text-muted-foreground break-words">
                {m.email}
                {m.phone ? `, ${m.phone}` : ""}. {topicLabels.get(m.topic) ?? m.topic}. {formatDateTime(m.createdAt)}
              </p>
              <p className="whitespace-pre-line text-sm break-words">{m.message}</p>
              <ContactStatusButton id={m.id} status={m.status} />
            </li>
          ))}
        </ul>
      )}
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} pathname="/admin/mensajes" params={{ q, state }} />
    </>
  );
}
