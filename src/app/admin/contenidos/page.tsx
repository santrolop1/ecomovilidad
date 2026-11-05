import { Megaphone, Newspaper, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { BannerDialog, NewsDialog, ValuePropDialog } from "@/features/admin/components/content-dialogs";
import { DeleteContent } from "@/features/admin/components/delete-content";
import { getAdminUser } from "@/features/admin/lib/guard";
import { adminApi } from "@/lib/api/admin";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata = { title: "Contenidos" };

function Section({ id, title, action, children }: { id: string; title: string; action: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="font-display-tight text-xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ title, detail, badge, actions }: { title: string; detail: ReactNode; badge: ReactNode; actions: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0 flex-1 basis-64">
        <p className="font-medium break-words">{title}</p>
        <div className="mt-0.5 text-sm text-muted-foreground">{detail}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {badge}
        {actions}
      </div>
    </li>
  );
}

const listClass = "divide-y divide-border rounded-2xl border border-border bg-card";

export default async function AdminContentPage() {
  if (!(await getAdminUser())) return null;
  const content = await adminApi.getContent();
  const now = new Date();

  return (
    <>
      <AdminPageHeader title="Contenidos" description="Lo que la tienda muestra en el inicio y en Nosotros. No hace falta desplegar código." />

      <Section id="vp" title="Propuesta de valor" action={<ValuePropDialog />}>
        {content.valuePropositions.length === 0 ? (
          <EmptyState icon={Sparkles} title="Sin propuestas" description="El inicio ocultará esta sección hasta que agregues una." />
        ) : (
          <ul className={listClass}>
            {content.valuePropositions.map((item) => (
              <Row
                key={item.id}
                title={`${item.position}. ${item.title}`}
                detail={item.description}
                badge={<StatusBadge tone={item.isActive ? "success" : "neutral"}>{item.isActive ? "Visible" : "Oculta"}</StatusBadge>}
                actions={<><ValuePropDialog item={item} /><DeleteContent kind="value-propositions" id={item.id} name={item.title} /></>}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section id="bn" title="Banners" action={<BannerDialog />}>
        {content.banners.length === 0 ? (
          <EmptyState icon={Megaphone} title="Sin banners" description="Crea uno con sus fechas de vigencia." />
        ) : (
          <ul className={listClass}>
            {content.banners.map((item) => {
              const live = item.isActive && new Date(item.startsAt) <= now && now <= new Date(item.endsAt);
              return (
                <Row
                  key={item.id}
                  title={item.title}
                  detail={`${formatDateTime(item.startsAt)} a ${formatDateTime(item.endsAt)}. Enlace: ${item.cta.href}`}
                  badge={<StatusBadge tone={live ? "success" : "neutral"}>{live ? "En la tienda" : item.isActive ? "Fuera de fechas" : "Inactivo"}</StatusBadge>}
                  actions={<><BannerDialog item={item} /><DeleteContent kind="banners" id={item.id} name={item.title} /></>}
                />
              );
            })}
          </ul>
        )}
      </Section>

      <Section id="nw" title="Noticias" action={<NewsDialog />}>
        {content.news.length === 0 ? (
          <EmptyState icon={Newspaper} title="Sin noticias" description="Las publicadas aparecen en Nosotros." />
        ) : (
          <ul className={listClass}>
            {content.news.map((item) => (
              <Row
                key={item.id}
                title={item.title}
                detail={`${formatDate(item.publishedAt)}. ${item.excerpt}`}
                badge={<StatusBadge tone={item.isPublished ? "success" : "neutral"}>{item.isPublished ? "Publicada" : "Borrador"}</StatusBadge>}
                actions={<><NewsDialog item={item} /><DeleteContent kind="news" id={item.id} name={item.title} /></>}
              />
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
