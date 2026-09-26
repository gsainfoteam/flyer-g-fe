import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PosterRenderModel } from "@/entities/poster";
import { usePlaybackReporting } from "@/features/display/model/use-playback-reporting";

function poster(id: string): PosterRenderModel {
  return {
    id,
    title: id,
    subtitle: null,
    categoryName: "공지",
    organizationName: "가상 조직",
    location: null,
    posterUrl: `/posters/${id}.webp`,
    detailUrl: `https://ziggle.gistory.me/notice/${id}`,
    startAt: new Date("2026-06-01T00:00:00Z"),
    endAt: new Date("2026-06-30T00:00:00Z"),
    revision: 3,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function setup(rendered: boolean, page = [poster("a")]) {
  const recordExposure = vi.fn();
  const reportRenderOk = vi.fn();
  const hook = renderHook(
    (props: { page: PosterRenderModel[]; rendered: boolean }) =>
      usePlaybackReporting({
        ...props,
        rotationSeconds: 10,
        recordExposure,
        reportRenderOk,
      }),
    { initialProps: { page, rendered } },
  );
  return { ...hook, recordExposure, reportRenderOk };
}

describe("usePlaybackReporting", () => {
  // 포스터가 한 장이면 페이지가 바뀌지 않는다. 그래도 노출은 쌓여야 한다.
  it("페이지가 그대로여도 전환 간격마다 노출을 기록한다", () => {
    const { recordExposure } = setup(true);

    act(() => vi.advanceTimersByTime(30_000));

    expect(recordExposure).toHaveBeenCalledTimes(3);
    expect(recordExposure).toHaveBeenLastCalledWith(
      expect.objectContaining({
        submissionId: "a",
        revision: 3,
        durationMs: 10_000,
        completed: true,
      }),
    );
  });

  it("페이지가 바뀌면 앞 페이지를 그때까지 보인 만큼 기록한다", () => {
    const { rerender, recordExposure } = setup(true);

    act(() => vi.advanceTimersByTime(4_000));
    rerender({ page: [poster("b")], rendered: true });

    expect(recordExposure).toHaveBeenCalledWith(
      expect.objectContaining({ submissionId: "a", durationMs: 4_000, completed: false }),
    );
  });

  it("이미지가 뜨지 않은 페이지는 기록하지도 정상 렌더링으로 보고하지도 않는다", () => {
    const { recordExposure, reportRenderOk } = setup(false);

    act(() => vi.advanceTimersByTime(30_000));

    expect(recordExposure).not.toHaveBeenCalled();
    expect(reportRenderOk).not.toHaveBeenCalled();
  });

  it("이미지가 뜨면 정상 렌더링을 보고한다", () => {
    const { rerender, reportRenderOk } = setup(false);

    rerender({ page: [poster("a")], rendered: true });

    expect(reportRenderOk).toHaveBeenCalled();
  });
});
