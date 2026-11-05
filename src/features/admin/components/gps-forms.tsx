"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assetKindLabels } from "@/features/operations/lib/labels";
import { assetKinds } from "@/features/operations/lib/telemetry";
import { useActionForm } from "@/hooks/use-action-form";
import type { ActionResult } from "@/lib/action-result";
import { formDataToObject } from "@/lib/validation";
import { createGeofence, createGpsDevice, setGeofenceActive, setGpsDeviceActive } from "../actions";
import { geofenceFormSchema, gpsDeviceFormSchema } from "../lib/schemas";

const selectClass = "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm";

function ActiveToggle({ label, isActive, action }: { label: string; isActive: boolean; action: () => Promise<ActionResult<unknown>> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      disabled={isPending}
      aria-label={`${isActive ? "Desactivar" : "Activar"} ${label}`}
      onClick={() =>
        startTransition(async () => {
          const result = await action();
          if (result.ok) router.refresh();
          else toast.error(result.message);
        })
      }
    >
      {isActive ? "Desactivar" : "Activar"}
    </Button>
  );
}

export function DeviceToggle({ id, code, isActive }: { id: string; code: string; isActive: boolean }) {
  return <ActiveToggle label={code} isActive={isActive} action={() => setGpsDeviceActive(id, !isActive)} />;
}

export function ZoneToggle({ id, name, isActive }: { id: string; name: string; isActive: boolean }) {
  return <ActiveToggle label={name} isActive={isActive} action={() => setGeofenceActive(id, !isActive)} />;
}

interface DeviceFormProps {
  branches: { id: string; name: string }[];
  couriers: { id: string; name: string }[];
}

export function GpsDeviceForm({ branches, couriers }: DeviceFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [created, setCreated] = useState<{ token: string; code: string } | null>(null);
  const form = useActionForm(gpsDeviceFormSchema, createGpsDevice, {
    onSuccess(data) {
      setCreated(data);
      formRef.current?.reset();
      router.refresh();
    },
  });
  return (
    <div className="space-y-4">
      {created && (
        <FormAlert variant="success">
          <span className="block font-medium">Token de {created.code}: cópialo ahora, no se vuelve a mostrar.</span>
          <code className="mt-1 block break-all text-xs">{created.token}</code>
          <button
            type="button"
            className="mt-2 text-xs underline"
            onClick={() => navigator.clipboard?.writeText(created.token).then(() => toast.success("Token copiado."))}
          >
            Copiar token
          </button>
        </FormAlert>
      )}
      <form
        ref={formRef}
        noValidate
        className="grid items-start gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          form.submit(formDataToObject(new FormData(event.currentTarget)), event.currentTarget);
        }}
      >
        {form.formError && <div className="sm:col-span-2 lg:col-span-5"><FormAlert variant="error">{form.formError}</FormAlert></div>}
        <FormField id="g-code" label="Código" error={form.fieldErrors.code}>
          {(control) => <Input {...control} name="code" maxLength={30} placeholder="DOM-01" />}
        </FormField>
        <FormField id="g-kind" label="Tipo" error={form.fieldErrors.kind}>
          {(control) => (
            <select {...control} name="kind" defaultValue="domicilio" className={selectClass}>
              {assetKinds.map((kind) => <option key={kind} value={kind}>{assetKindLabels[kind]}</option>)}
            </select>
          )}
        </FormField>
        <FormField id="g-branch" label="Base (opcional)" error={form.fieldErrors.branchId}>
          {(control) => (
            <select {...control} name="branchId" defaultValue="" className={selectClass}>
              <option value="">Sin base</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </FormField>
        <FormField id="g-courier" label="Domiciliario (opcional)" error={form.fieldErrors.courierId}>
          {(control) => (
            <select {...control} name="courierId" defaultValue="" className={selectClass}>
              <option value="">Ninguno</option>
              {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </FormField>
        <Button type="submit" className="h-10 rounded-full lg:mt-6" disabled={form.isPending}>
          Registrar
        </Button>
      </form>
    </div>
  );
}

export function GeofenceForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useActionForm(geofenceFormSchema, createGeofence, {
    onSuccess() {
      toast.success("Zona creada.");
      formRef.current?.reset();
      router.refresh();
    },
  });
  return (
    <form
      ref={formRef}
      noValidate
      className="grid items-start gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit(formDataToObject(new FormData(event.currentTarget)), event.currentTarget);
      }}
    >
      {form.formError && <div className="sm:col-span-2 lg:col-span-5"><FormAlert variant="error">{form.formError}</FormAlert></div>}
      <FormField id="z-name" label="Nombre" error={form.fieldErrors.name}>
        {(control) => <Input {...control} name="name" maxLength={80} />}
      </FormField>
      <FormField id="z-lat" label="Latitud del centro" error={form.fieldErrors.latitude}>
        {(control) => <Input {...control} name="latitude" inputMode="decimal" placeholder="7.1172" />}
      </FormField>
      <FormField id="z-lng" label="Longitud del centro" error={form.fieldErrors.longitude}>
        {(control) => <Input {...control} name="longitude" inputMode="decimal" placeholder="-73.1095" />}
      </FormField>
      <FormField id="z-radius" label="Radio en metros" error={form.fieldErrors.radiusM}>
        {(control) => <Input {...control} name="radiusM" inputMode="numeric" placeholder="5000" />}
      </FormField>
      <Button type="submit" className="h-10 rounded-full lg:mt-6" disabled={form.isPending}>
        Crear zona
      </Button>
    </form>
  );
}
