import { describe, expect, it, vi } from "vitest";
import { toPlaylist } from "@/entities/playlist";
import { preloadPlaylistMedia } from "@/features/display/model/preload-media";

const playlist = toPlaylist({
  serverTime: "2026-06-08T03:00:00.000Z",
  playlistVersion: "v1",
  refreshAfterSeconds: 60,
  layout: { type: "SINGLE", rotationSeconds: 10 },
  items: ["a", "b"].map((id) => ({
    submissionId: id,
    revision: 1,
    title: id,
    category: "공지",
    assetUrl: `/posters/${id}.webp`,
    detailUrl: `https://ziggle.gistory.me/notice/${id}`,
    startsAt: "2026-06-01T00:00:00.000Z",
    endsAt: "2026-06-30T00:00:00.000Z",
    priority: 0,
    checksum: `sha:${id}`,
  })),
});

describe("preloadPlaylistMedia", () => {
  it("이미 저장한 checksum은 다시 내려받지 않는다", async () => {
    const stored = new Blob(["a"]);
    const fetcher = vi.fn(async () => new Blob(["new"]));

    const media = await preloadPlaylistMedia(playlist, {
      fetcher,
      decoder: async () => {},
      reuse: async (checksum) => (checksum === "sha:a" ? stored : undefined),
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith("/posters/b.webp");
    expect(media.get("sha:a")).toBe(stored);
  });

  it("이미지가 있는 이벤트 배너도 받아 두고, 문구 배너는 받을 것이 없다", async () => {
    const period = {
      startsAt: "2026-06-01T00:00:00.000Z",
      endsAt: "2026-06-30T00:00:00.000Z",
    };
    const banner = {
      ...period,
      revision: 1,
      mode: "TEMPLATE" as const,
      occasion: "BIRTHDAY" as const,
      recipient: "지민",
      headline: "지민아, 생일 축하해",
      message: "축하해",
      sender: null,
    };
    const fetcher = vi.fn(async () => new Blob(["new"]));

    const media = await preloadPlaylistMedia(
      toPlaylist({
        serverTime: "2026-06-08T03:00:00.000Z",
        playlistVersion: "v2",
        refreshAfterSeconds: 60,
        layout: { type: "WALL", rotationSeconds: 10 },
        items: [],
        eventBanners: [
          {
            ...banner,
            submissionId: "photo",
            checksum: "sha:photo",
            photoUrl: "/photo.webp",
            assetUrl: null,
          },
          {
            ...banner,
            submissionId: "text",
            checksum: "sha:text",
            photoUrl: null,
            assetUrl: null,
          },
        ],
      }),
      { fetcher, decoder: async () => {} },
    );

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith("/photo.webp");
    expect([...media.keys()]).toEqual(["sha:photo"]);
  });
});
