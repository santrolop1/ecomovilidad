import { describe, expect, it } from "vitest";
import { addDays, todayInBogota } from "./dates";

describe("fechas", () => {
  it("usa el día de Colombia aunque en UTC ya sea mañana", () => {
    expect(todayInBogota(new Date("2026-11-10T03:00:00Z"))).toBe("2026-11-09");
  });

  it("suma días cruzando meses y años", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
