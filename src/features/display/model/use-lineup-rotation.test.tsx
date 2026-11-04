import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaybackContext } from "@/entities/lineup/model/playback";
import { DEFAULT_LINEUP_SETTINGS, newSubmissionBlock } from "@/entities/lineup/model/types";
import { useLineupRotation } from "./use-lineup-rotation";

const now = new Date("2026-11-04T03:00:00Z");
const context = (): PlaybackContext => ({
  lineup: { settings: { ...DEFAULT_LINEUP_SETTINGS }, programs: {}, blocks: [{ ...newSubmissionBlock("STORY"), id: "blk_story", perVisit: 1, durationSeconds: 15 }] },
  posters: [], content: { eventBanners: [], stories: ["a", "b", "c"].map((id) => ({ submissionId: id, revision: 1, checksum: id, startsAt: now, endsAt: new Date(now.getTime() + 3600000), storyNumber: 1, tag: "PRAISE", body: id })) },
  canHostGame: false, widgetRatio: 0,
});
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); localStorage.clear(); });
afterEach(() => vi.useRealTimers());

describe("블록 재생 hook", () => {
  it("내용이 같은 갱신에도 차례를 유지하고 재시작·기기별 커서를 분리한다", () => {
    const { result, rerender, unmount } = renderHook(() => useLineupRotation("tv-a", context(), now, false));
    expect(result.current.currentFrame).toMatchObject({ kind: "story", stories: [{ submissionId: "a" }] });
    act(() => vi.advanceTimersByTime(15000));
    expect(result.current.currentFrame).toMatchObject({ stories: [{ submissionId: "b" }] });
    rerender();
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.currentFrame).toMatchObject({ stories: [{ submissionId: "b" }] });
    unmount();
    const resumed = renderHook(() => useLineupRotation("tv-a", context(), now, false));
    expect(resumed.result.current.currentFrame).toMatchObject({ stories: [{ submissionId: "b" }] });
    const other = renderHook(() => useLineupRotation("tv-b", context(), now, false));
    expect(other.result.current.currentFrame).toMatchObject({ stories: [{ submissionId: "a" }] });
  });
  it("반복 렌더로 서버 시계를 되돌리지 않고 캐시된 기간 경계에서 멈춘다", () => {
    const ctx = context();
    ctx.lineup.blocks[0]!.schedule = { type: "DATE_RANGE", from: now.toISOString(), to: new Date(now.getTime() + 20000).toISOString() };
    const { result, rerender } = renderHook(() => useLineupRotation("tv", { ...ctx }, now, false));
    act(() => vi.advanceTimersByTime(15000));
    rerender();
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.currentFrame).toBeUndefined();
  });
});
