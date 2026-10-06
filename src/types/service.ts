export type ServiceIcon = "store" | "key" | "truck" | "wrench" | "map-pin" | "qr";

export interface Service {
  id: string;
  slug: string;
  title: string;
  summary: string;
  details: string[];
  icon: ServiceIcon;
  href: string;
}
