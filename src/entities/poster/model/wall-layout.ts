import { posterAspect } from "./types";
import type { PosterRenderModel } from "./types";

/**
 * 모아 보기(벽) 배치.
 *
 * 게시물을 비율 그대로 행에 늘어놓는다. 한 행의 이미지는 높이가 같고 폭은 비율을
 * 따른다. 행 수(1~3)는 이미지가 가장 크게 나오는 쪽을 고르고, 행마다 비율 합이
 * 고르게 나뉘도록 순서대로 자른다. 순서를 바꾸지 않으므로 다음에 크게 나올 게시물이
 * 벽 어디쯤 있는지 짐작할 수 있다.
 *
 * 한 쪽에 너무 많이 담으면 이미지가 알아볼 수 없게 작아진다. 가장 낮은 행이
 * `minRowHeight`보다 낮아지면 거기서 쪽을 넘긴다.
 *
 * 치수는 1920x1080 스테이지의 여백 안쪽(1760x920)에서 머리 줄을 뺀 영역 기준 px다.
 */
export interface WallMetrics {
  width: number;
  height: number;
  /** 이미지 사이 가로 간격 */
  gap: number;
  /** 행 사이 세로 간격 */
  rowGap: number;
  /** 이미지 아래 제목 한 줄의 높이(간격 포함) */
  caption: number;
  /** 이보다 낮은 행이 생기면 쪽을 넘긴다 */
  minRowHeight: number;
  maxRows: number;
  /** 한 쪽에 담는 최대 건수 */
  maxPerPage: number;
}

export const WALL_METRICS: WallMetrics = {
  width: 1760,
  height: 832,
  gap: 24,
  rowGap: 20,
  caption: 44,
  minRowHeight: 280,
  maxRows: 3,
  maxPerPage: 16,
};

export interface WallTile {
  poster: PosterRenderModel;
  width: number;
}

export interface WallRow {
  tiles: WallTile[];
  height: number;
}

function lowestRow(rows: WallRow[]): number {
  return Math.min(...rows.map((row) => row.height));
}

/** 행이 `rows`개일 때 한 행이 가질 수 있는 최대 높이 */
function rowHeightCap(rows: number, metrics: WallMetrics): number {
  return (
    (metrics.height - metrics.rowGap * (rows - 1)) / rows - metrics.caption
  );
}

function rowOf(
  posters: PosterRenderModel[],
  cap: number,
  metrics: WallMetrics,
): WallRow {
  const aspectSum = posters.reduce((sum, item) => sum + posterAspect(item), 0);
  const gaps = metrics.gap * (posters.length - 1);
  const height = Math.min(cap, (metrics.width - gaps) / aspectSum);
  return {
    height,
    tiles: posters.map((poster) => ({
      poster,
      width: posterAspect(poster) * height,
    })),
  };
}

/**
 * `posters`를 순서대로 `rows`개 행으로 나누는 방법 중 가장 낮은 행이 가장 높은 것.
 * 한 쪽에 담는 건수가 적어(최대 16) 모든 자르는 자리를 본다.
 */
function bestSplit(
  posters: PosterRenderModel[],
  rows: number,
  cap: number,
  metrics: WallMetrics,
): WallRow[] | null {
  if (posters.length < rows) return null;
  if (rows === 1) return [rowOf(posters, cap, metrics)];

  let best: WallRow[] | null = null;
  for (let cut = 1; cut <= posters.length - (rows - 1); cut++) {
    const rest = bestSplit(posters.slice(cut), rows - 1, cap, metrics);
    if (!rest) continue;
    const candidate = [rowOf(posters.slice(0, cut), cap, metrics), ...rest];
    if (!best || lowestRow(candidate) > lowestRow(best) + 0.5) {
      best = candidate;
    }
  }
  return best;
}

/** 주어진 게시물을 한 쪽에 놓는 배치. 이미지가 가장 크게 나오는 행 수를 고른다. */
export function layoutWallPage(
  posters: PosterRenderModel[],
  metrics: WallMetrics = WALL_METRICS,
): WallRow[] {
  if (posters.length === 0) return [];
  let best: WallRow[] = [rowOf(posters, rowHeightCap(1, metrics), metrics)];
  for (let rows = 2; rows <= metrics.maxRows; rows++) {
    const candidate = bestSplit(
      posters,
      rows,
      rowHeightCap(rows, metrics),
      metrics,
    );
    if (!candidate) break;
    // 행을 늘려서 확실히 커질 때만 늘린다. 비슷하면 행이 적은 쪽이 덜 어수선하다.
    if (lowestRow(candidate) > lowestRow(best) + 1) best = candidate;
  }
  return best;
}

/** 편성 전체를 쪽으로 나눈다. 순서를 지키고, 이미지가 너무 작아지기 전에 넘긴다. */
export function packWallPages(
  posters: PosterRenderModel[],
  metrics: WallMetrics = WALL_METRICS,
): PosterRenderModel[][] {
  const pages: PosterRenderModel[][] = [];
  let current: PosterRenderModel[] = [];

  for (const poster of posters) {
    const candidate = [...current, poster];
    const fits =
      candidate.length <= metrics.maxPerPage &&
      lowestRow(layoutWallPage(candidate, metrics)) >= metrics.minRowHeight;
    if (fits || current.length === 0) {
      current = candidate;
    } else {
      pages.push(current);
      current = [poster];
    }
  }
  if (current.length > 0) pages.push(current);
  return pages;
}
