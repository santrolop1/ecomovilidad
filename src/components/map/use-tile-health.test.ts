import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_TILE_ERRORS, TILE_TIMEOUT_MS, useTileHealth } from "./use-tile-health";

describe("useTileHealth", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("no marca el mapa como caído si llegó alguna tesela", () => {
    const onUnavailable = vi.fn();
    const { result } = renderHook(() => useTileHealth(onUnavailable));
    act(() => result.current.tileload());
    act(() => vi.advanceTimersByTime(TILE_TIMEOUT_MS * 3));
    expect(onUnavailable).not.toHaveBeenCalled();
  });

  it("muestra el fallback si no carga ninguna tesela a tiempo", () => {
    const onUnavailable = vi.fn();
    renderHook(() => useTileHealth(onUnavailable));
    act(() => vi.advanceTimersByTime(TILE_TIMEOUT_MS));
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });

  it("muestra el fallback tras varios errores, una sola vez", () => {
    const onUnavailable = vi.fn();
    const { result } = renderHook(() => useTileHealth(onUnavailable));
    act(() => {
      for (let i = 0; i < MAX_TILE_ERRORS + 3; i += 1) result.current.tileerror();
    });
    act(() => vi.advanceTimersByTime(TILE_TIMEOUT_MS));
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });
});
