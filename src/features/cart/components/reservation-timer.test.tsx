import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReservationTimer } from "./reservation-timer";

describe("ReservationTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T10:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("cuenta hacia atrás y avisa una sola vez al vencer", () => {
    const onExpire = vi.fn();
    render(<ReservationTimer until="2026-10-06T10:00:02Z" onExpire={onExpire} />);
    expect(screen.getByText("0:02")).toBeInTheDocument();
    expect(screen.getByText(/Reservado durante/)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("0:01")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText("Reserva vencida")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
