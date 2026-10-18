import { describe, expect, it } from "vitest";
import type { PosterRenderModel } from "./types";
import { layoutWallPage, packWallPages, WALL_METRICS } from "./wall-layout";

function poster(id: string, width: number, height: number): PosterRenderModel {
  return {
    id,
    title: id,
    subtitle: null,
    categoryName: "공지",
    organizerName: null,
    location: null,
    posterUrl: `/posters/${id}.webp`,
    width,
    height,
    detailUrl: null,
    startAt: new Date("2026-06-01T00:00:00Z"),
    endAt: new Date("2026-06-30T00:00:00Z"),
  };
}

const portrait = (id: string) => poster(id, 828, 1171);
const square = (id: string) => poster(id, 1080, 1080);
const banner = (id: string) => poster(id, 2400, 800);

/** 행이 본문 영역 안에 들어가는가 */
function fits(rows: ReturnType<typeof layoutWallPage>) {
  const height =
    rows.reduce((sum, row) => sum + row.height + WALL_METRICS.caption, 0) +
    WALL_METRICS.rowGap * (rows.length - 1);
  const widest = Math.max(
    ...rows.map(
      (row) =>
        row.tiles.reduce((sum, tile) => sum + tile.width, 0) +
        WALL_METRICS.gap * (row.tiles.length - 1),
    ),
  );
  return (
    height <= WALL_METRICS.height + 0.5 && widest <= WALL_METRICS.width + 0.5
  );
}

describe("layoutWallPage", () => {
  it("이미지는 비율 그대로 두고 영역 안에 담는다", () => {
    const rows = layoutWallPage([
      portrait("a"),
      portrait("b"),
      square("c"),
      banner("d"),
      portrait("e"),
    ]);
    expect(fits(rows)).toBe(true);
    for (const row of rows) {
      for (const tile of row.tiles) {
        expect(tile.width / row.height).toBeCloseTo(
          tile.poster.width / tile.poster.height,
        );
      }
    }
  });

  it("순서를 바꾸지 않는다", () => {
    const posters = ["a", "b", "c", "d", "e", "f"].map(portrait);
    const order = layoutWallPage(posters).flatMap((row) =>
      row.tiles.map((tile) => tile.poster.id),
    );
    expect(order).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("몇 장 안 되면 한 행에 크게 놓는다", () => {
    const rows = layoutWallPage([portrait("a"), portrait("b")]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.height).toBeGreaterThan(700);
  });
});

describe("packWallPages", () => {
  it("이미지가 너무 작아지기 전에 다음 쪽으로 넘긴다", () => {
    const posters = Array.from({ length: 30 }, (_, index) =>
      portrait(`p${index}`),
    );
    const pages = packWallPages(posters);

    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flat().map((item) => item.id)).toEqual(
      posters.map((item) => item.id),
    );
    for (const page of pages) {
      const lowest = Math.min(...layoutWallPage(page).map((row) => row.height));
      expect(lowest).toBeGreaterThanOrEqual(WALL_METRICS.minRowHeight);
    }
  });

  it("섞인 비율 여덟 건은 한 쪽에 담긴다", () => {
    const posters = [
      portrait("a"),
      portrait("b"),
      portrait("c"),
      portrait("d"),
      portrait("e"),
      poster("f", 1920, 1080),
      square("g"),
      banner("h"),
    ];
    expect(packWallPages(posters)).toHaveLength(1);
  });

  it("크기를 모르는 게시물은 세로 포스터로 보고 담는다", () => {
    const pages = packWallPages([poster("a", 0, 0), poster("b", 0, 0)]);
    expect(pages).toEqual([
      [
        expect.objectContaining({ id: "a" }),
        expect.objectContaining({ id: "b" }),
      ],
    ]);
  });
});
