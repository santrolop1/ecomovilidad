"use client";

import { Pause, Play, TriangleAlert } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { MapBoundary } from "@/components/map/map-boundary";
import { MapFallback } from "@/components/map/map-fallback";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { assetKindLabels, assetStatusColors, assetStatusCountLabels, assetStatusLabels } from "../lib/labels";
import { createSimulatedTelemetry, TIME_SCALE } from "../lib/simulated-telemetry";
import { type AssetKind, type AssetStatus, assetKinds, assetStatuses, countByStatus, type FleetAsset, type Hub } from "../lib/telemetry";
import { useTelemetry } from "../lib/use-telemetry";

const OperationsMap = dynamic(() => import("./operations-map"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-ink-2" aria-hidden="true" />,
});

const clock = new Intl.DateTimeFormat("es-CO", { timeStyle: "medium", timeZone: "America/Bogota" });

function Swatch({ kind, status }: { kind: AssetKind; status: AssetStatus }) {
  return (
    <span className="grid size-5 shrink-0 place-items-center" aria-hidden="true">
      <span className="em-asset" data-kind={kind} style={{ "--asset-color": assetStatusColors[status] } as React.CSSProperties} />
    </span>
  );
}

interface IndicatorProps {
  label: string;
  value: number | null;
  total?: number;
  /** Texto fijo bajo el valor cuando no hay porcentaje. */
  note?: string;
  color?: string;
  className?: string;
}

function Indicator({ label, value, total, note, color = "var(--paper)", className }: IndicatorProps) {
  const share = value !== null && total ? Math.round((value / total) * 100) : null;
  return (
    <div className={cn("min-w-0 bg-ink px-4 pt-3.5 pb-3", className)} style={{ boxShadow: `inset 0 2px 0 ${color}` }}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-display-tight tabular mt-1 text-3xl leading-none">{value ?? "–"}</dd>
      <dd className="tabular mt-1.5 text-xs text-muted-foreground">{share === null ? (note ?? " ") : `${share} % de la flota`}</dd>
    </div>
  );
}

function AssetDetail({ asset, hub }: { asset: FleetAsset; hub?: Hub }) {
  return (
    <div className="rounded-xl border border-ink-3 bg-ink p-4 text-sm">
      <div className="flex items-center gap-2">
        <Swatch kind={asset.kind} status={asset.status} />
        <p className="font-medium">
          {asset.code} <span className="text-muted-foreground">{assetKindLabels[asset.kind]}</span>
        </p>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <div>
          <dt className="text-xs text-muted-foreground">Estado</dt>
          <dd>{assetStatusLabels[asset.status]}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Batería</dt>
          <dd className="tabular">{Math.round(asset.batteryPct)} %</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted-foreground">Base</dt>
          <dd>{hub ? `${hub.name}, ${hub.city}` : "–"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted-foreground">Posición simulada</dt>
          <dd className="tabular">
            {asset.position.lat.toFixed(4)}, {asset.position.lng.toFixed(4)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Consola de "Operación en tiempo real". Las sucursales (bases) son datos reales;
 * los activos, sus posiciones y estados vienen de la telemetría SIMULADA.
 */
export function OperationsConsole({ hubs }: { hubs: Hub[] }) {
  const source = useMemo(() => createSimulatedTelemetry({ hubs }), [hubs]);
  const [paused, setPaused] = useState(false);
  const snapshot = useTelemetry(source, paused);
  // El aviso depende del origen de los datos: desaparecerá con telemetría GPS real.
  const simulated = source.origin === "simulada";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<AssetStatus | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState(false);

  const assets = snapshot?.assets ?? [];
  const counts = snapshot ? countByStatus(assets) : null;
  const visible = filter ? assets.filter((asset) => asset.status === filter) : assets;
  const selected = assets.find((asset) => asset.id === selectedId);
  const hubsById = new Map(hubs.map((hub) => [hub.id, hub]));
  const mapFallback = <MapFallback className="rounded-none border-0" description="La cartografía no cargó. Los indicadores y la lista de activos siguen funcionando." />;

  return (
    <section aria-labelledby="operacion-title" className="surface-ink overflow-hidden rounded-xl border border-ink-3">
      {simulated && (
        <div role="note" className="em-hazard flex flex-col gap-1 bg-amber-400 px-4 py-3 text-ink sm:flex-row sm:items-center sm:gap-4 sm:px-5">
          <p className="flex items-center gap-2 text-base font-extrabold tracking-wide uppercase">
            <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
            Modo demostración
          </p>
          <p className="text-sm font-medium">
            Posiciones, estados y batería <strong>simulados</strong> en este navegador. No hay telemetría GPS conectada.
          </p>
        </div>
      )}
      <header className="flex flex-col gap-3 border-b border-ink-3 bg-ink-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 id="operacion-title" className="font-display-tight text-lg">
            Operación en tiempo real
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Bases: {hubs.length} sucursales reales.{simulated && ` Flota simulada; el tiempo avanza ${TIME_SCALE} veces más rápido.`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
          <p className="flex items-center gap-2 rounded-full border border-ink-3 bg-ink px-3 py-1.5 text-xs font-medium">
            <span className={cn("size-2 rounded-full", paused ? "bg-muted-foreground" : "em-blink bg-amber-400")} aria-hidden="true" />
            {simulated ? (paused ? "Simulación en pausa" : "Simulación activa") : paused ? "En pausa" : "Recibiendo datos"}
          </p>
          <p className="tabular text-xs text-muted-foreground">{snapshot ? `Último dato ${clock.format(new Date(snapshot.at))}` : "Iniciando…"}</p>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>
            {paused ? <Play data-icon="inline-start" aria-hidden="true" /> : <Pause data-icon="inline-start" aria-hidden="true" />}
            {paused ? "Reanudar" : "Pausar"}
          </Button>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-px border-b border-ink-3 bg-ink-3 sm:grid-cols-5">
        <Indicator label="Activos" value={counts?.total ?? null} note={simulated ? "Flota simulada" : "Flota"} className="col-span-2 sm:col-span-1" />
        {assetStatuses.map((status) => (
          <Indicator
            key={status}
            label={assetStatusCountLabels[status]}
            value={counts?.[status] ?? null}
            total={counts?.total}
            color={assetStatusColors[status]}
          />
        ))}
      </dl>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative h-[min(62svh,560px)] min-h-[340px] bg-ink lg:h-[640px]">
          {mapUnavailable ? (
            mapFallback
          ) : (
            <MapBoundary fallback={mapFallback}>
              <OperationsMap hubs={hubs} assets={assets} selectedId={selectedId} onSelect={setSelectedId} onUnavailable={() => setMapUnavailable(true)} />
            </MapBoundary>
          )}
          {!mapUnavailable && <div className="em-hud" aria-hidden="true" />}
          {simulated && !mapUnavailable && (
            <p className="pointer-events-none absolute top-3 left-3 z-[500] flex items-center gap-2 rounded-md border-2 border-amber-400 bg-ink/90 px-2.5 py-1.5 text-xs font-bold tracking-wide text-amber-300 uppercase">
              <TriangleAlert className="size-4" aria-hidden="true" />
              Posiciones simuladas
            </p>
          )}
          <div className="pointer-events-none absolute bottom-7 left-3 z-[500] hidden rounded-lg border border-ink-3 bg-ink/90 px-3 py-2.5 text-xs backdrop-blur sm:block">
            <ul className="space-y-1">
              {assetKinds.map((kind) => (
                <li key={kind} className="flex items-center gap-2">
                  <Swatch kind={kind} status="disponible" />
                  {assetKindLabels[kind]}
                </li>
              ))}
              <li className="flex items-center gap-2">
                <span className="em-hub" aria-hidden="true" />
                Sucursal (ubicación real)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-0.5 w-5 bg-sky-400" aria-hidden="true" />
                Recorrido reciente
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 border-t-2 border-dashed border-sky-400" aria-hidden="true" />
                Hacia el punto de entrega
              </li>
            </ul>
          </div>
        </div>

        <aside aria-label="Activos" className="flex min-h-0 flex-col border-t border-ink-3 bg-ink-2 lg:h-[640px] lg:border-t-0 lg:border-l">
          <div className="space-y-3 border-b border-ink-3 p-4">
            <p className="flex items-baseline justify-between text-sm font-medium">
              Activos
              <span className="tabular text-xs font-normal text-muted-foreground">
                {visible.length} de {assets.length}
                {simulated && " (simulados)"}
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
              <button
                type="button"
                aria-pressed={filter === null}
                onClick={() => setFilter(null)}
                className="rounded-full border border-ink-3 px-3 py-1.5 text-xs aria-pressed:border-paper aria-pressed:bg-paper aria-pressed:text-ink"
              >
                Todos
              </button>
              {assetStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={filter === status}
                  onClick={() => setFilter(filter === status ? null : status)}
                  className="flex items-center gap-1.5 rounded-full border border-ink-3 px-3 py-1.5 text-xs aria-pressed:border-paper aria-pressed:bg-paper aria-pressed:text-ink"
                >
                  <span className="size-2 rounded-full" style={{ background: assetStatusColors[status] }} aria-hidden="true" />
                  {assetStatusLabels[status]}
                </button>
              ))}
            </div>
            {selected && <AssetDetail asset={selected} hub={hubsById.get(selected.hubId)} />}
          </div>
          <ul className="max-h-80 min-h-0 flex-1 overflow-y-auto lg:max-h-none">
            {visible.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(asset.id === selectedId ? null : asset.id)}
                  aria-pressed={asset.id === selectedId}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-ink-3/60 px-4 py-2.5 text-left text-sm hover:bg-ink-2",
                    asset.id === selectedId && "bg-ink-2",
                  )}
                >
                  <Swatch kind={asset.kind} status={asset.status} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{asset.code}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {assetKindLabels[asset.kind]}, {hubsById.get(asset.hubId)?.city}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs">
                    <span className="block">{assetStatusLabels[asset.status]}</span>
                    <span className="tabular block text-muted-foreground">{Math.round(asset.batteryPct)} %</span>
                  </span>
                </button>
              </li>
            ))}
            {snapshot && visible.length === 0 && <li className="px-4 py-6 text-sm text-muted-foreground">Ningún activo en este estado.</li>}
          </ul>
        </aside>
      </div>
    </section>
  );
}
