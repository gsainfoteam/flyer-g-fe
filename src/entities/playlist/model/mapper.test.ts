import { describe, expect, it } from "vitest";
import { parseIsoUtc, toIsoUtc } from "@/shared/lib/datetime";
import { selectPlayableItems, toPlaylist } from "./mapper";
import { clampRotationSeconds } from "./types";
import type { PlaylistDto } from "./types";

const dto: PlaylistDto = {
  serverTime: "2026-06-10T00:00:00.000Z",
  playlistVersion: "loc-house-a:184",
  refreshAfterSeconds: 60,
  layout: { type: "FOUR_GRID", rotationSeconds: 10 },
  items: [
    {
      submissionId: "s-1",
      revision: 3,
      title: "동아리 모집",
      category: "동아리",
      assetUrl: "https://cdn.example/optimized.webp",
      detailUrl: "https://ziggle.gistory.me/notices/1",
      startsAt: "2026-06-08T00:00:00.000Z",
      endsAt: "2026-06-15T00:00:00.000Z",
      priority: 0,
      checksum: "sha256:a",
    },
    {
      submissionId: "s-2",
      revision: 1,
      title: "지난 행사",
      category: "행사",
      assetUrl: "https://cdn.example/old.webp",
      detailUrl: "https://ziggle.gistory.me/notices/2",
      startsAt: "2026-06-01T00:00:00.000Z",
      endsAt: "2026-06-09T00:00:00.000Z",
      priority: 0,
      checksum: "sha256:b",
    },
  ],
};

describe("toPlaylist", () => {
  it("전송 모델의 날짜를 Date로 해석한다", () => {
    const playlist = toPlaylist(dto);
    expect(toIsoUtc(playlist.serverTime)).toBe(dto.serverTime);
    expect(toIsoUtc(playlist.items[0]!.startsAt)).toBe(dto.items[0]!.startsAt);
  });

  it("전환 간격을 안전 범위로 clamp한다", () => {
    expect(toPlaylist({ ...dto, layout: { type: "SINGLE", rotationSeconds: 1 } }).layout
      .rotationSeconds).toBe(5);
    expect(toPlaylist({ ...dto, layout: { type: "SINGLE", rotationSeconds: 600 } }).layout
      .rotationSeconds).toBe(60);
  });
});

describe("clampRotationSeconds", () => {
  it("잘못된 값은 기본값으로 되돌린다", () => {
    expect(clampRotationSeconds(Number.NaN)).toBe(10);
    expect(clampRotationSeconds(0)).toBe(10);
    expect(clampRotationSeconds(-5)).toBe(10);
    expect(clampRotationSeconds(12)).toBe(12);
  });
});

describe("selectPlayableItems", () => {
  it("서버 시각 기준으로 만료 항목을 방어적으로 제외한다", () => {
    const playlist = toPlaylist(dto);
    const items = selectPlayableItems(playlist);
    expect(items.map((item) => item.submissionId)).toEqual(["s-1"]);
  });

  it("모두 만료되면 빈 배열을 준다", () => {
    const playlist = toPlaylist(dto);
    expect(
      selectPlayableItems(playlist, parseIsoUtc("2026-07-01T00:00:00.000Z")),
    ).toEqual([]);
  });
});
