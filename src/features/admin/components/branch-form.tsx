"use client";

import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionForm } from "@/hooks/use-action-form";
import { type AdminBranchDetail, branchServices, serviceAreaCities } from "@/lib/api/admin-schemas";
import { createBranch, updateBranch } from "../actions";
import { serviceLabels } from "../lib/labels";
import { branchFormSchema, slugify } from "../lib/schemas";

type Hours = { days: string; opens: string; closes: string };
type Service = (typeof branchServices)[number];

const selectClass = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <legend className="font-display-tight float-left mb-4 w-full text-lg">{title}</legend>
      <div className="@container clear-both space-y-4">{children}</div>
    </fieldset>
  );
}

export function BranchForm({ branch }: { branch?: AdminBranchDetail }) {
  const router = useRouter();
  const [slug, setSlug] = useState(branch?.slug ?? "");
  const [hours, setHours] = useState<Hours[]>(branch?.openingHours ?? [{ days: "Lunes a viernes", opens: "08:00", closes: "18:00" }]);
  const [services, setServices] = useState<Service[]>(branch?.services ?? ["venta", "recogida"]);
  const [isDemo, setIsDemo] = useState(branch?.isDemo ?? false);
  const [isActive, setIsActive] = useState(branch?.isActive ?? true);
  const action = branch ? updateBranch.bind(null, branch.id) : createBranch;
  const form = useActionForm(branchFormSchema, action, {
    onSuccess({ id }) {
      toast.success(branch ? "Sucursal actualizada." : "Sucursal creada.");
      if (branch) router.refresh();
      else router.push(`/admin/sucursales/${id}`);
    },
  });
  const errors = form.fieldErrors;
  const hoursError = Object.entries(errors).find(([key]) => key.startsWith("openingHours"))?.[1];

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (key: string) => String(data.get(key) ?? "");
        form.submit(
          {
            slug,
            name: text("name"),
            address: text("address"),
            neighborhood: text("neighborhood"),
            city: text("city"),
            phone: text("phone"),
            latitude: text("latitude"),
            longitude: text("longitude"),
            openingHours: hours,
            services,
            isDemo,
            isActive,
          },
          event.currentTarget,
        );
      }}
    >
      {form.formError && <FormAlert variant="error">{form.formError}</FormAlert>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Datos">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="b-name" label="Nombre" error={errors.name}>
              {(control) => (
                <Input {...control} name="name" defaultValue={branch?.name} maxLength={80} onChange={(e) => !branch && setSlug(slugify(e.target.value))} />
              )}
            </FormField>
            <FormField id="b-slug" label="Slug" error={errors.slug}>
              {(control) => <Input {...control} value={slug} maxLength={80} onChange={(e) => setSlug(e.target.value)} />}
            </FormField>
            <FormField id="b-city" label="Municipio" error={errors.city}>
              {(control) => (
                <select {...control} name="city" defaultValue={branch?.city ?? ""} className={selectClass}>
                  <option value="" disabled>
                    Elige
                  </option>
                  {serviceAreaCities.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField id="b-neighborhood" label="Barrio" error={errors.neighborhood}>
              {(control) => <Input {...control} name="neighborhood" defaultValue={branch?.neighborhood} maxLength={80} />}
            </FormField>
            <FormField id="b-address" label="Dirección" error={errors.address} className="sm:col-span-2">
              {(control) => <Input {...control} name="address" defaultValue={branch?.address} maxLength={160} />}
            </FormField>
            <FormField id="b-phone" label="Teléfono" error={errors.phone}>
              {(control) => <Input {...control} name="phone" type="tel" defaultValue={branch?.phone} maxLength={20} />}
            </FormField>
          </div>
        </Section>

        <Section title="Ubicación">
          <p className="text-sm text-muted-foreground">
            Coordenadas WGS84. Deben estar dentro del área metropolitana; PostGIS calcula el punto geográfico automáticamente.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <FormField id="b-lat" label="Latitud" error={errors.latitude}>
              {(control) => <Input {...control} name="latitude" inputMode="decimal" defaultValue={branch?.latitude} placeholder="7.1172" />}
            </FormField>
            <FormField id="b-lng" label="Longitud" error={errors.longitude}>
              {(control) => <Input {...control} name="longitude" inputMode="decimal" defaultValue={branch?.longitude} placeholder="-73.1095" />}
            </FormField>
          </div>
        </Section>

        <Section title="Horario">
          <ul className="space-y-3">
            {hours.map((h, index) => (
              <li key={index} className="grid grid-cols-2 gap-2 rounded-xl border border-border p-3 @md:grid-cols-[minmax(0,1fr)_110px_110px_auto] @md:items-end">
                <div className="col-span-2 space-y-1 @md:col-span-1">
                  <Label htmlFor={`h-days-${index}`} className="text-xs text-muted-foreground">Días</Label>
                  <Input id={`h-days-${index}`} value={h.days} maxLength={40} onChange={(e) => setHours((rows) => rows.map((r, i) => (i === index ? { ...r, days: e.target.value } : r)))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`h-opens-${index}`} className="text-xs text-muted-foreground">Abre</Label>
                  <Input id={`h-opens-${index}`} type="time" value={h.opens} onChange={(e) => setHours((rows) => rows.map((r, i) => (i === index ? { ...r, opens: e.target.value } : r)))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`h-closes-${index}`} className="text-xs text-muted-foreground">Cierra</Label>
                  <Input id={`h-closes-${index}`} type="time" value={h.closes} onChange={(e) => setHours((rows) => rows.map((r, i) => (i === index ? { ...r, closes: e.target.value } : r)))} />
                </div>
                <Button type="button" variant="ghost" size="icon-lg" className="col-span-2 justify-self-end @md:col-span-1 @md:self-end" aria-label={`Quitar horario ${h.days}`} onClick={() => setHours((rows) => rows.filter((_, i) => i !== index))}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
          {hoursError && <p className="text-xs font-medium text-destructive">{hoursError}</p>}
          <Button type="button" variant="outline" size="lg" className="rounded-full" disabled={hours.length >= 7} onClick={() => setHours((rows) => [...rows, { days: "", opens: "09:00", closes: "17:00" }])}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Agregar horario
          </Button>
        </Section>

        <Section title="Servicios y estado">
          <div className="grid grid-cols-2 gap-3">
            {branchServices.map((service) => (
              <label key={service} className="flex min-h-10 items-center gap-2 text-sm">
                <Checkbox
                  checked={services.includes(service)}
                  onCheckedChange={(v) => setServices((list) => (v === true ? [...list, service] : list.filter((s) => s !== service)))}
                />
                {serviceLabels[service]}
              </label>
            ))}
          </div>
          <div className="space-y-3 border-t border-border pt-4">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} className="mt-0.5" />
              <span>
                <span className="font-medium">Activa</span>
                <span className="block text-muted-foreground">Visible en la tienda y disponible para recogidas.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={isDemo} onCheckedChange={(v) => setIsDemo(v === true)} className="mt-0.5" />
              <span>
                <span className="font-medium">Datos de demostración</span>
                <span className="block text-muted-foreground">Desmárcalo solo cuando dirección, teléfono y ubicación sean reales.</span>
              </span>
            </label>
          </div>
        </Section>
      </div>
      <Button type="submit" variant="brand" size="xl" className="w-full sm:w-auto" disabled={form.isPending}>
        {form.isPending ? "Guardando…" : branch ? "Guardar cambios" : "Crear sucursal"}
      </Button>
    </form>
  );
}
