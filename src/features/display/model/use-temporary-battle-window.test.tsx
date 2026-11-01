import { act, cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTemporaryBattleWindow } from "./use-temporary-battle-window";

beforeEach(() => {
  vi.useFakeTimers();
  // 기기 시계가 서버와 전혀 달라도 서버 기준으로 진행해야 한다.
  vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useTemporaryBattleWindow", () => {
  it("폴링 응답 없이도 18시에 시작하고 20시에 종료한다", () => {
    const serverTime = new Date("2026-11-02T17:59:59.999+09:00");
    const { result } = renderHook(() => useTemporaryBattleWindow(serverTime));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(2 * 60 * 60 * 1000 - 1));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });

  it("절전 뒤 다시 보이면 지나간 종료 경계를 즉시 적용한다", () => {
    const serverTime = new Date("2026-11-08T19:59:00+09:00");
    const { result } = renderHook(() => useTemporaryBattleWindow(serverTime));
    expect(result.current).toBe(true);
    vi.setSystemTime(Date.now() + 120_000);
    act(() => fireEvent(document, new Event("visibilitychange")));
    expect(result.current).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("서버 재동기화와 포커스 복귀를 적용한다", () => {
    const { result, rerender } = renderHook(({ time }) => useTemporaryBattleWindow(time), {
      initialProps: { time: new Date("2026-11-03T19:00:00+09:00") },
    });
    expect(result.current).toBe(true);
    rerender({ time: new Date("2026-11-03T17:59:00+09:00") });
    expect(result.current).toBe(false);
    vi.setSystemTime(Date.now() + 60_000);
    act(() => fireEvent(window, new Event("focus")));
    expect(result.current).toBe(true);
  });

  it("서버 시각이 없으면 강제 편성하지 않고, 종료·unmount 후 timer를 남기지 않는다", () => {
    const { result, rerender, unmount } = renderHook(({ time }) => useTemporaryBattleWindow(time), {
      initialProps: { time: null as Date | null },
    });
    expect(result.current).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    rerender({ time: new Date("2026-11-08T19:00:00+09:00") });
    expect(result.current).toBe(true);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
