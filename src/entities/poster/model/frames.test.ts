import { describe, expect, it } from "vitest";
import { framesPerCycle } from "@/entities/playlist/model/rotation";
import {
  buildFrames,
  exposedPosters,
  imagesOf,
  playingVideoOf,
  posterFrameSeconds,
} from "./frames";
import type { DisplayFrame } from "./frames";
import type { PosterRenderModel } from "./types";

function poster(id: string): PosterRenderModel {
  return {
    id,
    title: id,
    subtitle: null,
    categoryName: "공지",
    organizerName: null,
    location: null,
    posterUrl: `/posters/${id}.webp`,
    width: 1080,
    height: 1440,
    detailUrl: null,
    startAt: new Date("2026-06-01T00:00:00Z"),
    endAt: new Date("2026-06-30T00:00:00Z"),
  };
}

const posters = (...ids: string[]) => ids.map(poster);

const describeFrame = (frame: DisplayFrame) =>
  frame.kind === "wall"
    ? "벽"
    : frame.kind === "spotlight"
      ? frame.poster.id
      : `띠:${frame.focusIndex}`;

describe("buildFrames", () => {
  it("모아 보기는 벽 → 크게 세 건 → 벽 → 남은 건 순서다", () => {
    const frames = buildFrames(posters("a", "b", "c", "d", "e"), "WALL");
    expect(frames.map(describeFrame)).toEqual([
      "벽",
      "a",
      "b",
      "c",
      "벽",
      "d",
      "e",
    ]);
  });

  it("게시물이 한 건이면 벽 없이 크게만 보여 준다", () => {
    expect(buildFrames(posters("a"), "WALL").map(describeFrame)).toEqual(["a"]);
  });

  it("흐르는 띠는 한 건씩 가운데에 온다", () => {
    expect(
      buildFrames(posters("a", "b", "c"), "STRIP").map(describeFrame),
    ).toEqual(["띠:0", "띠:1", "띠:2"]);
  });

  it("게시판 현황과 같은 규칙으로 화면 수를 센다", () => {
    for (const count of [0, 1, 2, 3, 4, 7, 9]) {
      const items = Array.from({ length: count }, (_, index) =>
        poster(`p${index}`),
      );
      expect(buildFrames(items, "WALL")).toHaveLength(
        framesPerCycle("WALL", count),
      );
      expect(buildFrames(items, "STRIP")).toHaveLength(
        framesPerCycle("STRIP", count),
      );
    }
  });
});

describe("exposedPosters", () => {
  it("벽은 보이는 전부, 크게 보기와 띠는 주인공 한 건만 센다", () => {
    const items = posters("a", "b", "c");
    const [wall, spotlight] = buildFrames(items, "WALL");
    expect(exposedPosters(wall!, items).map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(exposedPosters(spotlight!, items).map((item) => item.id)).toEqual([
      "a",
    ]);

    const [strip] = buildFrames(items, "STRIP");
    expect(exposedPosters(strip!, items).map((item) => item.id)).toEqual(["a"]);
  });
});

describe("imagesOf", () => {
  it("띠는 화면 밖에서 새로 들어올 칸을 미리 받는다", () => {
    const items = posters("a", "b", "c", "d");
    const [strip] = buildFrames(items, "STRIP");
    expect(imagesOf(strip, items)).toEqual(["/posters/c.webp"]);
  });
});

describe("영상 포스터", () => {
  const video = (id: string, durationMs: number): PosterRenderModel => ({
    ...poster(id),
    videoUrl: `/videos/${id}.mp4`,
    durationMs,
  });

  it("크게 보기와 띠 가운데만 재생하고 벽에서는 재생하지 않는다", () => {
    const items = [video("v", 15_000), poster("a"), poster("b")];
    const wall = buildFrames(items, "WALL");
    expect(
      wall.map((frame) => playingVideoOf(frame, items)?.id ?? null),
    ).toEqual([null, "v", null, null]);

    const strip = buildFrames(items, "STRIP");
    expect(playingVideoOf(strip[0]!, items)?.id).toBe("v");
    expect(playingVideoOf(strip[1]!, items)).toBeNull();
  });

  it("영상은 끝까지 보여 주고, 전환 간격보다 짧으면 간격만큼 머문다", () => {
    const items = [video("long", 24_500), video("short", 4_000), poster("a")];
    const strip = buildFrames(items, "STRIP");
    expect(strip.map((frame) => posterFrameSeconds(frame, items, 10))).toEqual([
      25, 10, 10,
    ]);
  });
});
