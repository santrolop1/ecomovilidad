import { afterEach, describe, expect, it, vi } from "vitest";
import { createLiveTelemetry } from "./live-telemetry";

const fleet = {
  assets: [
    {
      id: "a1",
      code: "DOM-01",
      kind: "domicilio",
      status: "disponible",
      position: { lat: 7.1, lng: -73.1 },
      trail: [],
      batteryPct: null,
      hubId: null,
      updatedAt: "2026-11-05T12:00:00Z",
      stale: false,
      outsideZone: false,
    },
  ],
  zones: [],
  openAlerts: 2,
  activeDevices: 1,
  at: "2026-11-05T12:00:00Z",
};

describe("telemetría real", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("emite lo que reportan los dispositivos, marcado como GPS", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(fleet))));
    const listener = vi.fn();
    const cancel = createLiveTelemetry(60_000).subscribe(listener);
    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
    expect(listener.mock.calls[0][0]).toMatchObject({ origin: "gps", openAlerts: 2, at: fleet.at });
    expect(listener.mock.calls[0][0].assets[0].code).toBe("DOM-01");
    cancel();
  });

  it("si la consulta falla conserva lo último y reintenta", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 502 })).mockResolvedValue(new Response(JSON.stringify(fleet)));
    vi.stubGlobal("fetch", fetchMock);
    const listener = vi.fn();
    const cancel = createLiveTelemetry(1_000).subscribe(listener);
    await vi.advanceTimersByTimeAsync(0);
    expect(listener).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(listener).toHaveBeenCalledOnce();
    cancel();
  });
});
