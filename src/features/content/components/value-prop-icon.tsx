import { CreditCard, Leaf, MapPin, ShieldCheck, Truck, Wrench, type LucideIcon } from "lucide-react";
import type { ValuePropIcon } from "@/types";

/** El CMS envía un identificador de ícono; aquí se traduce a componente. */
const icons: Record<ValuePropIcon, LucideIcon> = {
  truck: Truck,
  shield: ShieldCheck,
  leaf: Leaf,
  wrench: Wrench,
  "map-pin": MapPin,
  "credit-card": CreditCard,
};

export function ValuePropIconView({ icon, className }: { icon: ValuePropIcon; className?: string }) {
  const Icon = icons[icon];
  return <Icon className={className} aria-hidden="true" />;
}
