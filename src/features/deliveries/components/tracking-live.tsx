"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { timeSlotLabels } from "@/features/account/lib/labels";
import { formatDate } from "@/lib/format";
import { deliveryTrackingSchema } from "@/lib/api/schemas";
import type { DeliveryTracking } from "@/types";
import { deliveryStatusLabels, deliveryStatusTone } from "../lib/labels";
import { DeliveryTimeline } from "./delivery-timeline";

const REFRESH_MS = 15_000;
const FINAL = new Set(["entregado", "fallido"]);

/** Consulta el avance cada 15 s mientras el domicilio no haya terminado. */
export function TrackingLive({ token, initial }: { token: string; initial: DeliveryTracking }) {
  const [tracking, setTracking] = useState(initial);
  const [stale, setStale] = useState(false);
  const finished = FINAL.has(tracking.status);

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/seguimiento/${encodeURIComponent(token)}`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        setTracking(deliveryTrackingSchema.parse(await response.json()));
        setStale(false);
      } catch {
        setStale(true);
      }
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [token, finished]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl">Tu domicilio</h1>
        <StatusBadge tone={deliveryStatusTone[tracking.status]}>{deliveryStatusLabels[tracking.status]}</StatusBadge>
      </header>
      <section className="rounded-2xl border border-border bg-card p-5">
        <DeliveryTimeline status={tracking.status} events={tracking.events} />
      </section>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Fecha</dt>
          <dd>{formatDate(`${tracking.scheduledDate}T12:00:00-05:00`)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Franja</dt>
          <dd>{timeSlotLabels[tracking.timeSlot] ?? tracking.timeSlot}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Despacha</dt>
          <dd>{tracking.branchName}</dd>
        </div>
        {tracking.courierFirstName && (
          <div>
            <dt className="text-xs text-muted-foreground">Domiciliario</dt>
            <dd>{tracking.courierFirstName}</dd>
          </div>
        )}
      </dl>
      {stale && <p className="text-xs text-muted-foreground">No pudimos actualizar el avance. Lo intentaremos de nuevo.</p>}
      {!finished && !stale && <p className="text-xs text-muted-foreground">Esta página se actualiza sola.</p>}
    </div>
  );
}
