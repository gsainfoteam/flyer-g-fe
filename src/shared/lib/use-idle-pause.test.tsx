import { act, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE_PAUSE, useIdlePause } from "./use-idle-pause";

let hidden = false;
beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => (hidden ? "hidden" : "visible"));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const setHidden = (value: boolean) => {
  hidden = value;
  fireEvent(document, new Event("visibilitychange"));
};

describe("useIdlePause", () => {
  it("판에 들어와 있지 않고 손대지 않으면 쉬고, 다시 손대면 붙는다", () => {
    const { result } = renderHook(() => useIdlePause(false));
    act(() => vi.advanceTimersByTime(IDLE_PAUSE.idleMs - IDLE_PAUSE.checkMs));
    expect(result.current.paused).toBe(false);
    act(() => vi.advanceTimersByTime(IDLE_PAUSE.checkMs * 2));
    expect(result.current.paused).toBe(true);
    act(() => result.current.resume());
    expect(result.current.paused).toBe(false);
  });

  it("손대면 기다리는 시간이 처음부터 다시 간다", () => {
    const { result } = renderHook(() => useIdlePause(false));
    act(() => vi.advanceTimersByTime(IDLE_PAUSE.idleMs - 10_000));
    fireEvent.pointerDown(window);
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current.paused).toBe(false);
  });

  it("판에 들어와 있으면 손대지 않아도 쉬지 않는다", () => {
    const { result } = renderHook(() => useIdlePause(true));
    act(() => vi.advanceTimersByTime(IDLE_PAUSE.idleMs * 3));
    expect(result.current.paused).toBe(false);
  });

  it("화면이 오래 가려지면 판 중이어도 쉬고, 다시 보이면 바로 붙는다", () => {
    const { result } = renderHook(() => useIdlePause(true));
    act(() => setHidden(true));
    act(() => vi.advanceTimersByTime(IDLE_PAUSE.hiddenMs + IDLE_PAUSE.checkMs));
    expect(result.current.paused).toBe(true);
    act(() => setHidden(false));
    expect(result.current.paused).toBe(false);
  });
});
