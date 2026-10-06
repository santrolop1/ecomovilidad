/**
 * Contenido gestionable por CMS (RF 1.1): propuesta de valor, banners y
 * noticias. Hoy proviene de mocks; mañana de GET /content/*.
 */
export interface CtaLink {
  label: string;
  href: string;
}

export interface HeroContent {
  title: string;
  subtitle: string;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
}

export type ValuePropIcon = "truck" | "shield" | "leaf" | "wrench" | "map-pin" | "credit-card";

export interface ValueProposition {
  id: string;
  title: string;
  description: string;
  icon: ValuePropIcon;
}

export interface Banner {
  id: string;
  title: string;
  description: string;
  cta: CtaLink;
  /** Fechas de vigencia (ISO 8601). */
  startsAt: string;
  endsAt: string;
}

export interface NewsItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqGroup {
  id: string;
  title: string;
  items: FaqItem[];
}

export interface HomeContent {
  hero: HeroContent;
  valuePropositions: ValueProposition[];
  banners: Banner[];
}

export interface ContactMessageInput {
  fullName: string;
  email: string;
  phone?: string;
  topic: "compra" | "alquiler" | "domicilio" | "mantenimiento" | "otro";
  message: string;
  dataConsent: true;
}
