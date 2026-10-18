import { SPOTLIGHTS_PER_WALL } from "@/entities/playlist/model/rotation";
import type { LayoutType } from "@/entities/playlist/model/types";
import type { PosterRenderModel } from "./types";
import { packWallPages } from "./wall-layout";

/**
 * TV가 차례로 보여 주는 화면 한 장. 한 장은 기기의 전환 간격만큼 머문다.
 *
 * - `wall`: 모아 보기. 다음에 크게 나올 게시물이 있는 쪽을 보여 준다.
 * - `spotlight`: 하나씩 크게. 제목·장소·QR과 다음 차례를 함께 보여 준다.
 * - `strip`: 흐르는 띠. `focusIndex`번째 게시물이 가운데에 온다.
 */
export type DisplayFrame =
  | { kind: "wall"; key: string; posters: PosterRenderModel[] }
  | {
      kind: "spotlight";
      key: string;
      poster: PosterRenderModel;
      upNext: PosterRenderModel[];
    }
  | { kind: "strip"; key: string; focusIndex: number };

/** 크게 보기 머리에 미리 보여 주는 다음 차례 수 */
const UP_NEXT_COUNT = 3;

function upNextOf(
  posters: PosterRenderModel[],
  index: number,
): PosterRenderModel[] {
  const count = Math.min(UP_NEXT_COUNT, posters.length - 1);
  return Array.from(
    { length: count },
    (_, offset) => posters[(index + offset + 1) % posters.length]!,
  );
}

/**
 * 편성을 화면 순서로 펼친다. 규칙은 `entities/playlist/model/rotation.ts`와 같다.
 *
 * 모아 보기는 벽 → 크게 3건 → 벽 → 다음 3건 순서다. 벽은 바로 다음에 크게 나올
 * 게시물이 들어 있는 쪽을 보여 준다. 게시물이 한 건뿐이면 벽 없이 크게만 보여 준다.
 */
export function buildFrames(
  posters: PosterRenderModel[],
  layout: LayoutType,
): DisplayFrame[] {
  if (posters.length === 0) return [];

  if (layout === "STRIP") {
    return posters.map((poster, focusIndex) => ({
      kind: "strip",
      key: `strip:${poster.id}`,
      focusIndex,
    }));
  }

  if (posters.length === 1) {
    return [
      {
        kind: "spotlight",
        key: `spot:${posters[0]!.id}`,
        poster: posters[0]!,
        upNext: [],
      },
    ];
  }

  const pages = packWallPages(posters);
  const pageOf = new Map<string, PosterRenderModel[]>();
  for (const page of pages) {
    for (const poster of page) pageOf.set(poster.id, page);
  }

  const frames: DisplayFrame[] = [];
  for (let start = 0; start < posters.length; start += SPOTLIGHTS_PER_WALL) {
    frames.push({
      kind: "wall",
      key: `wall:${posters[start]!.id}`,
      posters: pageOf.get(posters[start]!.id)!,
    });
    const end = Math.min(start + SPOTLIGHTS_PER_WALL, posters.length);
    for (let index = start; index < end; index++) {
      frames.push({
        kind: "spotlight",
        key: `spot:${posters[index]!.id}`,
        poster: posters[index]!,
        upNext: upNextOf(posters, index),
      });
    }
  }
  return frames;
}

/**
 * 이 화면에서 노출로 세는 게시물. 벽은 보이는 전부, 크게 보기는 그 한 건, 띠는
 * 가운데 한 건이다. 띠 양옆은 흐리게 보이는 미리보기라 세지 않는다.
 */
export function exposedPosters(
  frame: DisplayFrame,
  posters: PosterRenderModel[],
): PosterRenderModel[] {
  switch (frame.kind) {
    case "wall":
      return frame.posters;
    case "spotlight":
      return [frame.poster];
    case "strip": {
      const focus = posters[frame.focusIndex];
      return focus ? [focus] : [];
    }
  }
}

/** 다음 화면에서 처음 그려질 이미지. 전환 순간에 빈 칸이 보이지 않게 미리 받는다. */
export function imagesOf(
  frame: DisplayFrame | undefined,
  posters: PosterRenderModel[],
): string[] {
  if (!frame) return [];
  if (frame.kind === "strip") {
    // 띠는 다음 칸이 이미 화면 가장자리에 있다. 새로 들어올 두 칸 뒤를 받는다.
    const ahead = posters[(frame.focusIndex + 2) % posters.length];
    return ahead ? [ahead.posterUrl] : [];
  }
  return exposedPosters(frame, posters).map((poster) => poster.posterUrl);
}
