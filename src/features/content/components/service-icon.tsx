import { KeyRound, MapPin, QrCode, Store, Truck, Wrench, type LucideIcon } from "lucide-react";
import type { ServiceIcon } from "@/types";

const icons: Record<ServiceIcon, LucideIcon> = {
  store: Store,
  key: KeyRound,
  truck: Truck,
  wrench: Wrench,
  "map-pin": MapPin,
  qr: QrCode,
};

export function ServiceIconView({ icon, className }: { icon: ServiceIcon; className?: string }) {
  const Icon = icons[icon];
  return <Icon className={className} aria-hidden="true" />;
}
