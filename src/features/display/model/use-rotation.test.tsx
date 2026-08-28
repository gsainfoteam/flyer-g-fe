import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PosterRenderModel } from "@/entities/poster";
import { chunkIntoPages, useRotation } from "./use-rotation";

function poster(id: string): PosterRenderModel {
  return {
    id,
    title: `포스터 ${id}`,
    subtitle: null,
    categoryName: "공지",
    organizationName: "가상 조직",
    location: null,
    posterUrl: `/posters/${id}.webp`,
    detailUrl: `https://ziggle.gistory.me/notice/${id}`,
    startAt: new Date("2026-06-01T00:00:00Z"),
    endAt: new Date("2026-06-30T00:00:00Z"),
  };
}

const posters = (...ids: string[]) => ids.map(poster);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("chunkIntoPages", () => {
  it("SINGLE은 포스터 하나가 한 페이지다", () => {
    expect(chunkIntoPages(posters("a", "b", "c"), "SINGLE")).toHaveLength(3);
  });

  it("FOUR_GRID는 4개 단위로 나누고 마지막 페이지는 남은 만큼만 담는다", () => {
    const pages = chunkIntoPages(
      posters("a", "b", "c", "d", "e", "f"),
      "FOUR_GRID",
    );
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(4);
    expect(pages[1]).toHaveLength(2);
  });

  it("빈 목록은 빈 페이지 목록이다", () => {
    expect(chunkIntoPages([], "SINGLE")).toHaveLength(0);
  });
});

describe("useRotation", () => {
  it("간격마다 다음 페이지로 넘어가고 끝에서 처음으로 돌아온다", () => {
    const { result } = renderHook(() =>
      useRotation({
        posters: posters("a", "b", "c"),
        layout: "SINGLE",
        rotationSeconds: 10,
      }),
    );

    expect(result.current.currentPage[0]!.id).toBe("a");
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.currentPage[0]!.id).toBe("b");
    act(() => vi.advanceTimersByTime(20_000));
    expect(result.current.currentPage[0]!.id).toBe("a");
  });

  it("페이지가 하나면 timer를 만들지 않는다", () => {
    const spy = vi.spyOn(window, "setInterval");
    renderHook(() =>
      useRotation({
        posters: posters("a", "b", "c", "d"),
        layout: "FOUR_GRID",
        rotationSeconds: 10,
      }),
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it("목록이 갱신돼도 보고 있던 항목을 따라간다", () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: PosterRenderModel[] }) =>
        useRotation({ posters: items, layout: "SINGLE", rotationSeconds: 10 }),
      { initialProps: { items: posters("a", "b", "c") } },
    );

    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.currentPage[0]!.id).toBe("b");

    // 앞에 새 항목이 끼어들어도 b를 계속 보여준다.
    rerender({ items: posters("z", "a", "b", "c") });
    expect(result.current.currentPage[0]!.id).toBe("b");
  });

  it("보고 있던 항목이 사라지면 처음 페이지로 돌아간다", () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: PosterRenderModel[] }) =>
        useRotation({ posters: items, layout: "SINGLE", rotationSeconds: 10 }),
      { initialProps: { items: posters("a", "b") } },
    );

    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.currentPage[0]!.id).toBe("b");

    rerender({ items: posters("a", "c") });
    expect(result.current.currentPage[0]!.id).toBe("a");
  });

  it("일시정지하면 넘어가지 않는다", () => {
    const { result } = renderHook(() =>
      useRotation({
        posters: posters("a", "b"),
        layout: "SINGLE",
        rotationSeconds: 10,
        paused: true,
      }),
    );

    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.currentPage[0]!.id).toBe("a");
  });

  it("advance는 수동으로 다음 페이지로 넘긴다", () => {
    const { result } = renderHook(() =>
      useRotation({
        posters: posters("a", "b"),
        layout: "SINGLE",
        rotationSeconds: 10,
        paused: true,
      }),
    );

    act(() => result.current.advance());
    expect(result.current.currentPage[0]!.id).toBe("b");
  });

  it("unmount 시 timer가 정리된다", () => {
    const clearSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = renderHook(() =>
      useRotation({
        posters: posters("a", "b"),
        layout: "SINGLE",
        rotationSeconds: 10,
      }),
    );
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});
