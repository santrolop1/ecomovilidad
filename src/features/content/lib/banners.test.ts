import { describe, expect, it } from "vitest";
import type { Banner } from "@/types";
import { getActiveBanners } from "./banners";

const banner: Banner = {
  id: "b1",
  title: "T",
  description: "D",
  cta: { label: "Ver", href: "/" },
  startsAt: "2026-10-01T00:00:00-05:00",
  endsAt: "2026-10-31T23:59:59-05:00",
};

describe("getActiveBanners", () => {
  it("muestra solo banners vigentes", () => {
    expect(getActiveBanners([banner], new Date("2026-10-15T12:00:00-05:00"))).toHaveLength(1);
    expect(getActiveBanners([banner], new Date("2026-11-01T12:00:00-05:00"))).toHaveLength(0);
  });
});
