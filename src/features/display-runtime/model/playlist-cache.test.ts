import { beforeEach, describe, expect, it, vi } from "vitest";
import { toPlaylist } from "@/entities/playlist";
import type { Playlist } from "@/entities/playlist/model/types";
import { createMemoryStore } from "@/shared/storage";
import type { KeyValueStore } from "@/shared/storage";
import { installObjectUrlMock } from "@/test/object-url";
import { createPlaylistCache } from "./playlist-cache";
import { preloadPlaylistMedia } from "./preload-media";

const NOW = new Date("2026-06-08T03:00:00.000Z");

function playlist(items: { id: string; checksum: string }[]): Playlist {
  return toPlaylist({
    serverTime: NOW.toISOString(),
    playlistVersion: "v:1",
    refreshAfterSeconds: 60,
    layout: { type: "SINGLE", rotationSeconds: 10 },
    items: items.map(({ id, checksum }) => ({
      submissionId: id,
      revision: 1,
      title: id,
      category: "공지",
      assetUrl: `/posters/${id}.webp`,
      detailUrl: `https://ziggle.gistory.me/notice/${id}`,
      startsAt: new Date(NOW.getTime() - 3600_000).toISOString(),
      endsAt: new Date(NOW.getTime() + 86400_000).toISOString(),
      priority: 0,
      checksum,
    })),
  });
}

const blob = (content: string) => new Blob([content], { type: "image/webp" });

describe("createPlaylistCache", () => {
  let store: KeyValueStore;

  beforeEach(() => {
    installObjectUrlMock();
    store = createMemoryStore();
  });

  it("저장한 편성을 미디어 URL과 함께 복원한다", async () => {
    const cache = createPlaylistCache(store);
    const list = playlist([
      { id: "a", checksum: "sha:a" },
      { id: "b", checksum: "sha:b" },
    ]);
    await cache.save(
      list,
      new Map([
        ["sha:a", blob("a")],
        ["sha:b", blob("b")],
      ]),
    );

    const loaded = await cache.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.playlist.playlistVersion).toBe("v:1");
    expect(loaded!.posterUrls.get("a")).toMatch(/^blob:/);
    expect(loaded!.posterUrls.get("b")).toMatch(/^blob:/);
  });

  it("미디어가 빠진 편성은 승격을 거부한다", async () => {
    const cache = createPlaylistCache(store);
    const list = playlist([
      { id: "a", checksum: "sha:a" },
      { id: "b", checksum: "sha:b" },
    ]);

    await expect(
      cache.save(list, new Map([["sha:a", blob("a")]])),
    ).rejects.toThrow(/승격할 수 없습니다/);
    expect(await cache.load()).toBeNull();
  });

  it("새 편성이 참조하지 않는 미디어를 정리한다", async () => {
    const cache = createPlaylistCache(store);
    await cache.save(
      playlist([{ id: "a", checksum: "sha:old" }]),
      new Map([["sha:old", blob("old")]]),
    );
    await cache.save(
      playlist([{ id: "b", checksum: "sha:new" }]),
      new Map([["sha:new", blob("new")]]),
    );

    const keys = await store.keys();
    expect(keys).toContain("media:sha:new");
    expect(keys).not.toContain("media:sha:old");
  });

  it("서버-기기 시계 차이를 보존한다", async () => {
    // 기기 시계가 서버보다 1시간 늦게 맞춰진 상황.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW.getTime() - 3600_000));
    try {
      const cache = createPlaylistCache(store);
      await cache.save(
        playlist([{ id: "a", checksum: "sha:a" }]),
        new Map([["sha:a", blob("a")]]),
      );
      const loaded = await cache.load();
      expect(loaded!.clockOffsetMs).toBe(3600_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it("release가 만든 blob URL을 전부 해제한다", async () => {
    const urls = installObjectUrlMock();
    const cache = createPlaylistCache(store);
    await cache.save(
      playlist([{ id: "a", checksum: "sha:a" }]),
      new Map([["sha:a", blob("a")]]),
    );

    const loaded = await cache.load();
    loaded!.release();
    expect(urls.revoked).toEqual(urls.created);
  });
});

describe("preloadPlaylistMedia", () => {
  it("같은 checksum은 한 번만 받고 decode를 검증한다", async () => {
    const fetcher = vi.fn(async () => blob("x"));
    const decoder = vi.fn(async () => {});
    const list = playlist([
      { id: "a", checksum: "sha:same" },
      { id: "b", checksum: "sha:same" },
      { id: "c", checksum: "sha:other" },
    ]);

    const media = await preloadPlaylistMedia(list, { fetcher, decoder });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(decoder).toHaveBeenCalledTimes(2);
    expect(media.size).toBe(2);
  });

  it("하나라도 실패하면 전체가 실패한다", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes("bad")) throw new Error("404");
      return blob("x");
    });
    const list = playlist([
      { id: "good", checksum: "sha:good" },
      { id: "bad", checksum: "sha:bad" },
    ]);

    await expect(
      preloadPlaylistMedia(list, { fetcher, decoder: async () => {} }),
    ).rejects.toThrow();
  });

  it("decode에 실패한 blob은 캐시하지 않는다", async () => {
    const list = playlist([{ id: "a", checksum: "sha:a" }]);
    await expect(
      preloadPlaylistMedia(list, {
        fetcher: async () => blob("corrupt"),
        decoder: async () => {
          throw new Error("decode 불가");
        },
      }),
    ).rejects.toThrow();
  });
});
