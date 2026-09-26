import { describe, expect, it } from "vitest";
import { toPlaylist } from "@/entities/playlist";
import type { SubmissionView } from "@/entities/submission/model/types";
import { parseIsoUtc } from "@/shared/lib/datetime";
import { fromPlaylistItem, fromSubmissionView } from "./types";

const view: SubmissionView = {
  id: "s-1",
  title: "동아리 모집",
  subtitle: null,
  categoryName: "동아리",
  organizationName: "지구는 처음이야",
  status: "PUBLISHED",
  startAt: parseIsoUtc("2026-06-08T00:00:00.000Z"),
  endAt: parseIsoUtc("2026-06-15T00:00:00.000Z"),
  createdAt: parseIsoUtc("2026-06-01T00:00:00.000Z"),
  submittedAt: parseIsoUtc("2026-06-01T00:00:00.000Z"),
  requesterId: "user-1",
  posterUrl: "/posters/a.png",
  detailUrl: "https://ziggle.gistory.me/notices/1",
  location: "제1학생회관",
  description: "업사이클링 워크숍",
  targetGroupIds: [],
  version: 1,
};

describe("fromSubmissionView", () => {
  it("표시 모델을 포스터 렌더 모델로 옮긴다", () => {
    expect(fromSubmissionView(view)).toMatchObject({
      id: "s-1",
      title: "동아리 모집",
      categoryName: "동아리",
      organizationName: "지구는 처음이야",
      location: "제1학생회관",
      detailUrl: "https://ziggle.gistory.me/notices/1",
    });
  });

  it("subtitle이 없으면 설명으로 대신한다", () => {
    expect(fromSubmissionView(view).subtitle).toBe("업사이클링 워크숍");
    expect(
      fromSubmissionView({ ...view, subtitle: "부제" }).subtitle,
    ).toBe("부제");
  });
});

describe("fromPlaylistItem", () => {
  const playlist = toPlaylist({
    serverTime: "2026-06-10T00:00:00.000Z",
    playlistVersion: "v1",
    refreshAfterSeconds: 60,
    layout: { type: "SINGLE", rotationSeconds: 10 },
    items: [
      {
        submissionId: "s-2",
        revision: 1,
        title: "정기공연",
        category: "공연",
        assetUrl: "https://cdn.example/a.webp",
        detailUrl: "https://ziggle.gistory.me/notices/2",
        startsAt: "2026-06-08T00:00:00.000Z",
        endsAt: "2026-06-15T00:00:00.000Z",
        priority: 0,
        checksum: "sha256:a",
        location: "오룡관",
        organizerName: "도백 도둑",
      },
    ],
  });

  it("편성 항목을 같은 렌더 모델로 옮긴다", () => {
    const poster = fromPlaylistItem(playlist.items[0]!);
    expect(poster).toMatchObject({
      id: "s-2",
      title: "정기공연",
      categoryName: "공연",
      organizationName: "도백 도둑",
      location: "오룡관",
      posterUrl: "https://cdn.example/a.webp",
    });
  });

  it("미리보기와 플레이어가 같은 키를 쓴다", () => {
    const fromView = Object.keys(fromSubmissionView(view)).sort();
    const fromItem = Object.keys(fromPlaylistItem(playlist.items[0]!)).sort();
    expect(fromItem).toEqual(fromView);
  });
});
