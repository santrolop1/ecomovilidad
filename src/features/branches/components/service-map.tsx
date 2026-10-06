"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Branch } from "@/types";
import { ReferenceMap } from "./reference-map";

// Google Maps solo se descarga si hay API key (code splitting).
const GoogleBranchMap = dynamic(() => import("./google-branch-map"), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[4/5] rounded-3xl" />,
});

export interface MapConfig {
  apiKey?: string;
  mapId: string;
}

interface ServiceMapProps {
  config: MapConfig;
  branches: Branch[];
  selectedId: string | null;
  onSelect: (branchId: string) => void;
}

/** Elige el proveedor de mapa disponible sin mostrar errores al usuario. */
export function ServiceMap({ config, branches, selectedId, onSelect }: ServiceMapProps) {
  const [googleUnavailable, setGoogleUnavailable] = useState(false);

  if (config.apiKey && !googleUnavailable) {
    return (
      <GoogleBranchMap
        apiKey={config.apiKey}
        mapId={config.mapId}
        branches={branches}
        selectedId={selectedId}
        onSelect={onSelect}
        onUnavailable={() => setGoogleUnavailable(true)}
      />
    );
  }
  return <ReferenceMap branches={branches} selectedId={selectedId} onSelect={onSelect} />;
}
