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
});
