"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deliveryNextLabels } from "@/features/deliveries/lib/labels";
import type { ActionResult } from "@/lib/action-result";
import type { AdminDelivery, Courier, GpsDevice } from "@/lib/api/admin-schemas";
import {
  assignDelivery,
  assignDeliveryDrone,
  assignNearestDelivery,
  changeDeliveryStatus,
  recordDeliveryDrop,
  validateDelivery,
} from "../actions";
import { SignaturePad } from "./signature-pad";

const selectClass = "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm";

/** Centro de cada municipio: punto de partida para ubicar la entrega del dron. */
const cityCenters: Record<string, { lat: number; lng: number }> = {
  Bucaramanga: { lat: 7.1193, lng: -73.1227 },
  Floridablanca: { lat: 7.0647, lng: -73.0899 },
  Girón: { lat: 7.0682, lng: -73.1698 },
  Piedecuesta: { lat: 6.9875, lng: -73.0503 },
};

interface Props {
  delivery: AdminDelivery;
  couriers: Courier[];
  drones?: GpsDevice[];
}

export function DeliveryActions({ delivery, couriers, drones = [] }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [carrier, setCarrier] = useState(delivery.carrier);
  const [courierId, setCourierId] = useState(delivery.courierId ?? "");
  const [droneId, setDroneId] = useState(delivery.droneDeviceId ?? "");
  const center = cityCenters[delivery.deliveryCity ?? ""] ?? cityCenters.Bucaramanga;
  const [latitude, setLatitude] = useState(String(delivery.destinationLatitude ?? center.lat));
  const [longitude, setLongitude] = useState(String(delivery.destinationLongitude ?? center.lng));
  const [note, setNote] = useState("");
  const isDrone = delivery.carrier === "dron";
  const [method, setMethod] = useState<"qr" | "firma" | "dron">("qr");
  const [code, setCode] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult<unknown>>, message: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setError(undefined);
        setNote("");
        toast.success(message);
        router.refresh();
      } else {
        setError(result.fieldErrors ? Object.values(result.fieldErrors)[0] : result.message);
      }
    });
  }

  const advance = delivery.allowedTransitions.filter((s) => s === "en_recogida" || s === "en_transito");
  const canFail = delivery.allowedTransitions.includes("fallido");
  const canReschedule = delivery.allowedTransitions.includes("creado");
  const active = couriers.filter((c) => c.isActive);

  if (
    !delivery.canAssign &&
    !delivery.canValidate &&
    !delivery.canRecordDrop &&
    !canFail &&
    !canReschedule &&
    advance.length === 0
  ) {
    return <p className="text-sm text-muted-foreground">Estado final: no admite más cambios.</p>;
  }

  return (
    <div className="space-y-5">
      {error && <FormAlert variant="error">{error}</FormAlert>}

      {delivery.canAssign && (
        <div className="flex gap-2" role="group" aria-label="Quién lleva el domicilio">
          <Button type="button" size="sm" className="rounded-full" variant={carrier === "domiciliario" ? "default" : "outline"} onClick={() => setCarrier("domiciliario")}>
            Domiciliario
          </Button>
          <Button type="button" size="sm" className="rounded-full" variant={carrier === "dron" ? "default" : "outline"} onClick={() => setCarrier("dron")}>
            Dron
          </Button>
        </div>
      )}

      {delivery.canAssign && carrier === "dron" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="d-drone">Dron</Label>
            <select id="d-drone" value={droneId} onChange={(e) => setDroneId(e.target.value)} className={selectClass}>
              <option value="">Elige un dron</option>
              {drones.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                  {d.branchName ? ` (${d.branchName})` : ""}
                </option>
              ))}
            </select>
            {drones.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Registra un dispositivo GPS de tipo dron, sin unidad de alquiler, en Operación &gt; Dispositivos GPS.
              </p>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="d-lat">Latitud de entrega</Label>
              <Input id="d-lat" inputMode="decimal" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="tabular bg-card" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="d-lng">Longitud de entrega</Label>
              <Input id="d-lng" inputMode="decimal" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="tabular bg-card" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Punto exacto donde el dron dejará el paquete. Para registrar la entrega, el GPS del dron debe estar a menos de 50 m de aquí.
          </p>
          <Button
            type="button"
            className="h-10 rounded-full"
            disabled={isPending || !droneId}
            onClick={() =>
              run(
                () => assignDeliveryDrone(delivery.id, { droneDeviceId: droneId, destinationLatitude: latitude, destinationLongitude: longitude }),
                "Dron asignado.",
              )
            }
          >
            Asignar dron
          </Button>
        </div>
      )}

      {delivery.canAssign && carrier === "domiciliario" && (
        <div className="space-y-2">
          <Label htmlFor="d-courier">Domiciliario</Label>
          <div className="flex flex-wrap gap-2">
            <select id="d-courier" value={courierId} onChange={(e) => setCourierId(e.target.value)} className={`${selectClass} min-w-48 flex-1`}>
              <option value="">Elige un domiciliario</option>
              {active.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.openDeliveries} en curso)
                </option>
              ))}
            </select>
            <Button
              type="button"
              className="h-10 rounded-full"
              disabled={isPending || !courierId || courierId === delivery.courierId}
              onClick={() => run(() => assignDelivery(delivery.id, courierId), "Domiciliario asignado.")}
            >
              Asignar
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={isPending}
            onClick={() => run(() => assignNearestDelivery(delivery.id), "Asignado al domiciliario más cercano.")}
          >
            Asignar al más cercano (GPS)
          </Button>
          {active.length === 0 && <p className="text-xs text-muted-foreground">Primero agrega un domiciliario activo.</p>}
        </div>
      )}

      {advance.map((status) => (
        <Button
          key={status}
          type="button"
          className="h-10 rounded-full"
          disabled={isPending}
          onClick={() => run(() => changeDeliveryStatus(delivery.id, { status }), "Estado actualizado.")}
        >
          {deliveryNextLabels[status]}
        </Button>
      ))}

      {delivery.canRecordDrop && (
        <div className="space-y-2 rounded-xl border border-border p-4">
          <p className="text-sm font-medium">El dron va en camino</p>
          <p className="text-sm text-muted-foreground">
            Cuando el dron suelte el paquete, avisa con su token por <span className="tabular">/api/telemetry/drops</span>. Si no puede avisar, regístralo aquí con su última posición GPS.
          </p>
          <Button type="button" className="h-10 rounded-full" disabled={isPending} onClick={() => run(() => recordDeliveryDrop(delivery.id), "Liberación registrada.")}>
            Registrar liberación con el GPS del dron
          </Button>
        </div>
      )}

      {delivery.canValidate && isDrone && (
        <p className="rounded-xl bg-muted p-3 text-sm">
          El dron dejó el paquete a {delivery.dropDistanceM} m del punto de entrega. El cliente debe confirmar en su cuenta que lo recibió; también puedes validar con su código.
          {!delivery.canCloseWithDroneEvidence && " Si no confirma ni reclama en 30 minutos, podrás cerrar con la evidencia del dron."}
        </p>
      )}

      {delivery.canValidate && (
        <fieldset className="space-y-3 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-medium">Validar la entrega</legend>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="rounded-full" variant={method === "qr" ? "default" : "outline"} onClick={() => setMethod("qr")}>
              Código QR
            </Button>
            {!isDrone && (
              <Button type="button" size="sm" className="rounded-full" variant={method === "firma" ? "default" : "outline"} onClick={() => setMethod("firma")}>
                Firma
              </Button>
            )}
            {delivery.canCloseWithDroneEvidence && (
              <Button type="button" size="sm" className="rounded-full" variant={method === "dron" ? "default" : "outline"} onClick={() => setMethod("dron")}>
                Evidencia del dron
              </Button>
            )}
          </div>
          {method === "dron" ? (
            <p className="text-sm text-muted-foreground">
              Pasaron más de 30 minutos desde que el dron dejó el paquete y el cliente no confirmó ni reclamó. La entrega se cierra con la posición GPS registrada.
            </p>
          ) : method === "qr" ? (
            <div className="space-y-1">
              <Label htmlFor="d-code">Código del cliente</Label>
              <Input id="d-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className="max-w-40 bg-card" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="d-signer">Quién recibe</Label>
                <Input id="d-signer" maxLength={120} value={signerName} onChange={(e) => setSignerName(e.target.value)} className="bg-card" />
              </div>
              <SignaturePad onChange={setSignature} />
            </div>
          )}
          <Button
            type="button"
            className="h-10 rounded-full"
            disabled={isPending}
            onClick={() =>
              run(
                () =>
                  validateDelivery(
                    delivery.id,
                    method === "qr"
                      ? { method, code }
                      : method === "dron"
                        ? { method }
                        : { method, signerName, signatureImage: signature ?? "" },
                  ),
                "Entrega validada. El pedido quedó completado.",
              )
            }
          >
            Confirmar entrega
          </Button>
        </fieldset>
      )}

      {(canFail || canReschedule) && (
        <div className="space-y-2">
          <Label htmlFor="d-note">{canFail ? "Si no se pudo entregar, explica por qué" : "Nota para reprogramar (opcional)"}</Label>
          <Textarea id="d-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className="bg-card" />
          <div className="flex flex-wrap gap-2">
            {canFail && (
              <Button type="button" variant="outline" className="h-10 rounded-full" disabled={isPending} onClick={() => run(() => changeDeliveryStatus(delivery.id, { status: "fallido", note }), "Domicilio marcado como fallido.")}>
                Marcar como fallido
              </Button>
            )}
            {canReschedule && (
              <Button type="button" className="h-10 rounded-full" disabled={isPending} onClick={() => run(() => changeDeliveryStatus(delivery.id, { status: "creado", note: note || undefined }), "Domicilio reprogramado.")}>
                Reprogramar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
