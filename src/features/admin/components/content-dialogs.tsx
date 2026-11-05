"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";
import type { AdminContent } from "@/lib/api/admin-schemas";
import { valuePropIcons } from "@/lib/api/admin-schemas";
import { formDataToObject } from "@/lib/validation";
import { saveBanner, saveNews, saveValueProp } from "../actions";
import { bannerFormSchema, newsFormSchema, slugify, valuePropFormSchema } from "../lib/schemas";

const selectClass = "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm";

const iconLabels: Record<(typeof valuePropIcons)[number], string> = {
  truck: "Camión",
  shield: "Escudo",
  leaf: "Hoja",
  wrench: "Llave",
  "map-pin": "Ubicación",
  "credit-card": "Tarjeta",
};

/** Valor para <input type="datetime-local"> en hora de Colombia. */
function toBogotaInput(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("sv-SE", { timeZone: "America/Bogota" }).replace(" ", "T").slice(0, 16);
}

function useDialog(message: string) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return {
    open,
    setOpen,
    onSuccess() {
      toast.success(message);
      setOpen(false);
      router.refresh();
    },
  };
}

function Shell({
  title,
  isEdit,
  newLabel,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  isEdit: boolean;
  newLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant={isEdit ? "outline" : "brand"} size={isEdit ? "sm" : "lg"} className="rounded-full">
          {isEdit ? "Editar" : newLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Los cambios se ven en la tienda en unos momentos.</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function ActiveCheckbox({ id, name, label, defaultChecked }: { id: string; name: string; label: string; defaultChecked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <input id={id} name={name} type="checkbox" defaultChecked={defaultChecked} className="size-4" />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

function Submit({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" variant="brand" size="xl" className="w-full" disabled={pending}>
      {pending ? "Guardando…" : "Guardar"}
    </Button>
  );
}

export function ValuePropDialog({ item }: { item?: AdminContent["valuePropositions"][number] }) {
  const dialog = useDialog(item ? "Propuesta actualizada." : "Propuesta creada.");
  const form = useActionForm(valuePropFormSchema, saveValueProp.bind(null, item?.id ?? null), { onSuccess: dialog.onSuccess });
  const errors = form.fieldErrors;
  return (
    <Shell title={item ? "Editar propuesta de valor" : "Nueva propuesta de valor"} isEdit={!!item} newLabel="Nueva propuesta" open={dialog.open} onOpenChange={dialog.setOpen}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          form.submit(formDataToObject(new FormData(event.currentTarget), ["isActive"]), event.currentTarget);
        }}
      >
        {form.formError && <FormAlert variant="error">{form.formError}</FormAlert>}
        <FormField id="vp-title" label="Título" error={errors.title}>
          {(control) => <Input {...control} name="title" defaultValue={item?.title} maxLength={80} />}
        </FormField>
        <FormField id="vp-description" label="Descripción" error={errors.description}>
          {(control) => <Textarea {...control} name="description" defaultValue={item?.description} rows={3} maxLength={240} />}
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="vp-icon" label="Icono" error={errors.icon}>
            {(control) => (
              <select {...control} name="icon" defaultValue={item?.icon ?? "truck"} className={selectClass}>
                {valuePropIcons.map((icon) => <option key={icon} value={icon}>{iconLabels[icon]}</option>)}
              </select>
            )}
          </FormField>
          <FormField id="vp-position" label="Orden" error={errors.position}>
            {(control) => <Input {...control} name="position" inputMode="numeric" defaultValue={item?.position ?? 0} />}
          </FormField>
        </div>
        <ActiveCheckbox id="vp-active" name="isActive" label="Visible en la tienda" defaultChecked={item?.isActive ?? true} />
        <Submit pending={form.isPending} />
      </form>
    </Shell>
  );
}

export function BannerDialog({ item }: { item?: AdminContent["banners"][number] }) {
  const dialog = useDialog(item ? "Banner actualizado." : "Banner creado.");
  const form = useActionForm(bannerFormSchema, saveBanner.bind(null, item?.id ?? null), { onSuccess: dialog.onSuccess });
  const errors = form.fieldErrors;
  return (
    <Shell title={item ? "Editar banner" : "Nuevo banner"} isEdit={!!item} newLabel="Nuevo banner" open={dialog.open} onOpenChange={dialog.setOpen}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          form.submit(formDataToObject(new FormData(event.currentTarget), ["isActive"]), event.currentTarget);
        }}
      >
        {form.formError && <FormAlert variant="error">{form.formError}</FormAlert>}
        <FormField id="bn-title" label="Título" error={errors.title}>
          {(control) => <Input {...control} name="title" defaultValue={item?.title} maxLength={80} />}
        </FormField>
        <FormField id="bn-description" label="Descripción" error={errors.description}>
          {(control) => <Textarea {...control} name="description" defaultValue={item?.description} rows={2} maxLength={240} />}
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="bn-label" label="Texto del botón" error={errors.ctaLabel}>
            {(control) => <Input {...control} name="ctaLabel" defaultValue={item?.cta.label} maxLength={40} />}
          </FormField>
          <FormField id="bn-href" label="Enlace interno" error={errors.ctaHref}>
            {(control) => <Input {...control} name="ctaHref" defaultValue={item?.cta.href} maxLength={200} placeholder="/catalogo" />}
          </FormField>
          <FormField id="bn-start" label="Empieza" error={errors.startsAt}>
            {(control) => <Input {...control} name="startsAt" type="datetime-local" defaultValue={toBogotaInput(item?.startsAt)} />}
          </FormField>
          <FormField id="bn-end" label="Termina" error={errors.endsAt}>
            {(control) => <Input {...control} name="endsAt" type="datetime-local" defaultValue={toBogotaInput(item?.endsAt)} />}
          </FormField>
        </div>
        <ActiveCheckbox id="bn-active" name="isActive" label="Activo" defaultChecked={item?.isActive ?? true} />
        <Submit pending={form.isPending} />
      </form>
    </Shell>
  );
}

export function NewsDialog({ item }: { item?: AdminContent["news"][number] }) {
  const dialog = useDialog(item ? "Noticia actualizada." : "Noticia creada.");
  const [slug, setSlug] = useState(item?.slug ?? "");
  const form = useActionForm(newsFormSchema, saveNews.bind(null, item?.id ?? null), { onSuccess: dialog.onSuccess });
  const errors = form.fieldErrors;
  return (
    <Shell title={item ? "Editar noticia" : "Nueva noticia"} isEdit={!!item} newLabel="Nueva noticia" open={dialog.open} onOpenChange={dialog.setOpen}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          form.submit({ ...formDataToObject(new FormData(event.currentTarget), ["isPublished"]), slug }, event.currentTarget);
        }}
      >
        {form.formError && <FormAlert variant="error">{form.formError}</FormAlert>}
        <FormField id="nw-title" label="Título" error={errors.title}>
          {(control) => (
            <Input {...control} name="title" defaultValue={item?.title} maxLength={120} onChange={(e) => !item && setSlug(slugify(e.target.value))} />
          )}
        </FormField>
        <FormField id="nw-slug" label="Slug" error={errors.slug}>
          {(control) => <Input {...control} value={slug} maxLength={80} onChange={(e) => setSlug(e.target.value)} />}
        </FormField>
        <FormField id="nw-excerpt" label="Resumen" error={errors.excerpt}>
          {(control) => <Textarea {...control} name="excerpt" defaultValue={item?.excerpt} rows={3} maxLength={300} />}
        </FormField>
        <FormField id="nw-date" label="Fecha de publicación" error={errors.publishedAt}>
          {(control) => <Input {...control} name="publishedAt" type="datetime-local" defaultValue={toBogotaInput(item?.publishedAt)} />}
        </FormField>
        <ActiveCheckbox id="nw-published" name="isPublished" label="Publicada" defaultChecked={item?.isPublished ?? true} />
        <Submit pending={form.isPending} />
      </form>
    </Shell>
  );
}
