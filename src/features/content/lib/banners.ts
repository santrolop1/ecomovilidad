import type { Banner } from "@/types";

/** Banners vigentes en `now` (el CMS define la ventana de publicación). */
export function getActiveBanners(banners: Banner[], now: Date): Banner[] {
  const time = now.getTime();
  return banners.filter((banner) => new Date(banner.startsAt).getTime() <= time && time <= new Date(banner.endsAt).getTime());
}
