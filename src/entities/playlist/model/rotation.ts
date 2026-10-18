import type { LayoutType } from "./types";

/**
 * 화면 전환 순서의 규칙. 플레이어(`buildFrames`)와 게시판 현황(`boardRotationOf`)이
 * 같은 규칙으로 센다.
 *
 * - WALL: 벽 한 번 → 크게 `SPOTLIGHTS_PER_WALL`건 → 다시 벽 → 다음 건들. 모든
 *   게시물이 한 번씩 크게 나오면 한 바퀴다.
 * - STRIP: 한 칸씩 민다. 모든 게시물이 한 번씩 가운데에 오면 한 바퀴다.
 *
 * 한 화면(벽·크게·띠의 한 칸)은 기기의 전환 간격(`rotationSeconds`)만큼 머문다.
 */
export const SPOTLIGHTS_PER_WALL = 3;

export const LAYOUT_LABELS: Record<LayoutType, string> = {
  WALL: "모아 보기",
  STRIP: "흐르는 띠",
};

export const LAYOUT_DESCRIPTIONS: Record<LayoutType, string> = {
  WALL: "전체를 한 화면에 모았다가 몇 건씩 크게",
  STRIP: "한 줄로 이어 붙여 한 칸씩 밀기",
};

/**
 * 한 바퀴에 나오는 화면 수. 게시물이 한 건뿐이면 넘기지 않으므로 1이다.
 * 게시물이 없으면 0이다.
 */
export function framesPerCycle(layout: LayoutType, count: number): number {
  if (count <= 1) return count;
  if (layout === "STRIP") return count;
  return Math.ceil(count / SPOTLIGHTS_PER_WALL) + count;
}
