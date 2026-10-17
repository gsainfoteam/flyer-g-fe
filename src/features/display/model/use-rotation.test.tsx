import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PosterRenderModel } from "@/entities/poster";
import type { DisplayFrame } from "@/entities/poster/model/frames";
import { useRotation } from "./use-rotation";

function poster(id: string): PosterRenderModel {
  return {
    id,
    title: `포스터 ${id}`,
    subtitle: null,
    categoryName: "공지",
    organizerName: "가상 조직",
    location: null,
    posterUrl: `/posters/${id}.webp`,
    width: 1080,
    height: 1440,
    detailUrl: `https://ziggle.gistory.me/notice/${id}`,
    startAt: new Date("2026-06-01T00:00:00Z"),
    endAt: new Date("2026-06-30T00:00:00Z"),
  };
}

const posters = (...ids: string[]) => ids.map(poster);

/** 화면에서 지금 주인공인 게시물. 벽이면 `wall` */
function focusOf(frame: DisplayFrame | undefined, items: PosterRenderModel[]) {
  if (!frame) return null;
  if (frame.kind === "wall") return "wall";
  if (frame.kind === "spotlight") return frame.poster.id;
  return items[frame.focusIndex]!.id;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useRotation", () => {
  it("간격마다 다음 화면으로 넘어가고 끝에서 처음으로 돌아온다", () => {
    const items = posters("a", "b", "c");
    const { result } = renderHook(() =>
      useRotation({ posters: items, layout: "STRIP", rotationSeconds: 10 }),
    );

    expect(focusOf(result.current.currentFrame, items)).toBe("a");
    act(() => vi.advanceTimersByTime(10_000));
    expect(focusOf(result.current.currentFrame, items)).toBe("b");
    act(() => vi.advanceTimersByTime(20_000));
    expect(focusOf(result.current.currentFrame, items)).toBe("a");
  });

  it("모아 보기는 벽과 크게 보기를 번갈아 넘긴다", () => {
    const items = posters("a", "b", "c", "d");
    const { result } = renderHook(() =>
      useRotation({ posters: items, layout: "WALL", rotationSeconds: 10 }),
    );

    const seen = [focusOf(result.current.currentFrame, items)];
    for (let step = 0; step < result.current.frameCount; step++) {
      act(() => vi.advanceTimersByTime(10_000));
      seen.push(focusOf(result.current.currentFrame, items));
    }
    expect(seen).toEqual(["wall", "a", "b", "c", "wall", "d", "wall"]);
  });

  it("화면이 하나면 timer를 만들지 않는다", () => {
    const spy = vi.spyOn(window, "setInterval");
    renderHook(() =>
      useRotation({
        posters: posters("a"),
        layout: "WALL",
        rotationSeconds: 10,
      }),
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it("목록이 갱신돼도 보고 있던 항목을 따라간다", () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: PosterRenderModel[] }) =>
        useRotation({ posters: items, layout: "STRIP", rotationSeconds: 10 }),
      { initialProps: { items: posters("a", "b", "c") } },
    );

    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.currentFrame?.key).toBe("strip:b");

    // 앞에 새 항목이 끼어들어도 b를 계속 보여준다.
    rerender({ items: posters("z", "a", "b", "c") });
    expect(result.current.currentFrame?.key).toBe("strip:b");
  });

  it("보고 있던 항목이 사라지면 처음 화면으로 돌아간다", () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: PosterRenderModel[] }) =>
        useRotation({ posters: items, layout: "STRIP", rotationSeconds: 10 }),
      { initialProps: { items: posters("a", "b") } },
    );

    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.currentFrame?.key).toBe("strip:b");

    rerender({ items: posters("a", "c") });
    expect(result.current.currentFrame?.key).toBe("strip:a");
  });

  it("같은 게시물이라도 이미지가 바뀌면 새 이미지로 그린다", () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: PosterRenderModel[] }) =>
        useRotation({ posters: items, layout: "WALL", rotationSeconds: 10 }),
      { initialProps: { items: posters("a") } },
    );

    rerender({ items: [{ ...poster("a"), posterUrl: "blob:cached-a" }] });
    const frame = result.current.currentFrame;
    expect(frame?.kind === "spotlight" && frame.poster.posterUrl).toBe(
      "blob:cached-a",
    );
  });

  it("일시정지하면 넘어가지 않는다", () => {
    const { result } = renderHook(() =>
      useRotation({
        posters: posters("a", "b"),
        layout: "STRIP",
        rotationSeconds: 10,
        paused: true,
      }),
    );

    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.currentFrame?.key).toBe("strip:a");
  });

  it("advance는 수동으로 다음 화면으로 넘기고, 다음 화면을 미리 알린다", () => {
    const { result } = renderHook(() =>
      useRotation({
        posters: posters("a", "b"),
        layout: "STRIP",
        rotationSeconds: 10,
        paused: true,
      }),
    );

    expect(result.current.nextFrame?.key).toBe("strip:b");
    act(() => result.current.advance());
    expect(result.current.currentFrame?.key).toBe("strip:b");
  });

  it("unmount 시 timer가 정리된다", () => {
    const clearSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = renderHook(() =>
      useRotation({
        posters: posters("a", "b"),
        layout: "STRIP",
        rotationSeconds: 10,
      }),
    );
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});
