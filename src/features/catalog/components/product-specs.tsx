import type { ProductSpec } from "@/types";

function formatSpecValue(spec: ProductSpec): string {
  const value = typeof spec.value === "number" ? spec.value.toLocaleString("es-CO") : spec.value;
  return spec.unit ? `${value} ${spec.unit}` : value;
}

export function ProductSpecs({ specs }: { specs: ProductSpec[] }) {
  return (
    <dl className="divide-y divide-border rounded-2xl border border-border bg-card">
      {specs.map((spec) => (
        <div key={spec.key} className="grid grid-cols-2 gap-4 px-5 py-3.5 text-sm">
          <dt className="text-muted-foreground">{spec.label}</dt>
          <dd className="tabular font-medium">{formatSpecValue(spec)}</dd>
        </div>
      ))}
    </dl>
  );
}
