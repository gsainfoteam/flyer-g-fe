import { act, cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTimeSlot } from "./use-time-slot";

beforeEach(() => {
  vi.useFakeTimers();
  // 기기 시계가 서버와 전혀 달라도 서버 기준으로 진행해야 한다.
  vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const ruleId = (value: ReturnType<typeof useTimeSlot>) => value?.rule.id ?? null;
const EVENT = "2026-11-event-click-battle";
/** 11/5부터는 셔플보드가 이벤트 시간을 점유한다. */
const LAST_EVENT = "2026-11-event-shuffleboard";

describe("useTimeSlot", () => {
  it("폴링 응답 없이도 20시에 시작하고 22시에 끝난다", () => {
    const serverTime = new Date("2026-11-02T19:59:59.999+09:00");
    const { result } = renderHook(() => useTimeSlot(serverTime));
    expect(ruleId(result.current)).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(ruleId(result.current)).toBe(EVENT);
    expect(result.current?.endsAt).toBe(Date.parse("2026-11-02T22:00:00+09:00"));
    act(() => vi.advanceTimersByTime(2 * 60 * 60 * 1000 - 1));
    expect(ruleId(result.current)).toBe(EVENT);
    act(() => vi.advanceTimersByTime(1));
    expect(ruleId(result.current)).toBeNull();
  });

  it("절전 뒤 다시 보이면 지나간 마지막 종료를 바로 적용하고 timer를 남기지 않는다", () => {
    const serverTime = new Date("2026-11-07T21:59:00+09:00");
    const { result } = renderHook(() => useTimeSlot(serverTime));
    expect(ruleId(result.current)).toBe(LAST_EVENT);
    vi.setSystemTime(Date.now() + 120_000);
    act(() => fireEvent(document, new Event("visibilitychange")));
    expect(ruleId(result.current)).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("서버 재동기화와 포커스 복귀를 적용한다", () => {
    const { result, rerender } = renderHook(({ time }) => useTimeSlot(time), {
      initialProps: { time: new Date("2026-11-03T21:00:00+09:00") },
    });
    expect(ruleId(result.current)).toBe(EVENT);
    rerender({ time: new Date("2026-11-03T19:59:00+09:00") });
    expect(ruleId(result.current)).toBeNull();
    vi.setSystemTime(Date.now() + 60_000);
    act(() => fireEvent(window, new Event("focus")));
    expect(ruleId(result.current)).toBe(EVENT);
  });

  it("서버 시각이 없으면 점유하지 않고, unmount 후 timer를 남기지 않는다", () => {
    const { result, rerender, unmount } = renderHook(({ time }) => useTimeSlot(time), {
      initialProps: { time: null as Date | null },
    });
    expect(result.current).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    rerender({ time: new Date("2026-11-07T21:00:00+09:00") });
    expect(ruleId(result.current)).toBe(LAST_EVENT);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
