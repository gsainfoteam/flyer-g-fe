import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { RepositoriesContext } from "@/app/providers/repositories-context";
import { toPlaylist } from "@/entities/playlist";
import type { Playlist } from "@/entities/playlist/model/types";
import { createMockRepositories } from "@/mocks/repositories";
import type { Repositories } from "@/shared/api/repositories";
import { createFixedClock } from "@/shared/lib/clock";
import { parseIsoUtc } from "@/shared/lib/datetime";
import { createMemoryStore, openVersionedStore } from "@/shared/storage";
import type { KeyValueStore } from "@/shared/storage";
import { installObjectUrlMock } from "@/test/object-url";
import { createPlaylistCache } from "./playlist-cache";
import { CACHE_SCHEMA_VERSION, useOfflinePlaylist } from "./use-offline-playlist";

/**
 * hook은 주입된 store를 schema version으로 감싼다. 미리 심는 캐시도 같은 래퍼를
 * 거쳐야 한다. 아니면 hook이 "다른 schema"로 보고 전부 비운다.
 */
async function primedCache(store: KeyValueStore) {
  return createPlaylistCache(await openVersionedStore(store, CACHE_SCHEMA_VERSION));
}

const NOW = parseIsoUtc("2026-06-08T03:00:00.000Z");

function playlistFixture(ids: string[], overrides: Partial<{ endInMs: number }> = {}): Playlist {
  return toPlaylist({
    serverTime: NOW.toISOString(),
    playlistVersion: `v:${ids.join(",")}`,
    refreshAfterSeconds: 60,
    layout: { type: "SINGLE", rotationSeconds: 10 },
    items: ids.map((id) => ({
      submissionId: id,
      revision: 1,
      title: id,
      category: "공지",
      assetUrl: `/posters/${id}.webp`,
      detailUrl: `https://ziggle.gistory.me/notice/${id}`,
      startsAt: new Date(NOW.getTime() - 3600_000).toISOString(),
      endsAt: new Date(
        NOW.getTime() + (overrides.endInMs ?? 86400_000),
      ).toISOString(),
      priority: 0,
      checksum: `sha:${id}`,
    })),
  });
}

function makeWrapper(repositories: Repositories) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <RepositoriesContext.Provider value={repositories}>
          {children}
        </RepositoriesContext.Provider>
      </QueryClientProvider>
    );
  };
}

const instantPreload = {
  fetcher: async () => new Blob(["x"], { type: "image/webp" }),
  decoder: async () => {},
};

function repositoriesWith(fn: () => Promise<Playlist>): Repositories {
  const repositories = createMockRepositories({
    clock: createFixedClock(NOW),
  });
  vi.spyOn(repositories.displays, "getPlaylist").mockImplementation(fn);
  return repositories;
}

beforeEach(() => {
  installObjectUrlMock();
  vi.stubGlobal("createImageBitmap", async () => ({ close: () => {} }));
  return () => vi.unstubAllGlobals();
});

describe("useOfflinePlaylist", () => {
  it("온라인 편성을 재생하며 백그라운드에서 캐시로 승격한다", async () => {
    const store = createMemoryStore();
    const repositories = repositoriesWith(async () =>
      playlistFixture(["a", "b"]),
    );

    const { result } = renderHook(
      () =>
        useOfflinePlaylist("device-1", { store, preload: instantPreload }),
      { wrapper: makeWrapper(repositories) },
    );

    await waitFor(() => expect(result.current.source).toBe("network"));
    expect(result.current.playlist?.posters).toHaveLength(2);

    // 미디어 검증까지 끝난 뒤에만 캐시가 생긴다.
    await waitFor(async () => {
      const cached = await createPlaylistCache(store).load();
      expect(cached).not.toBeNull();
      cached!.release();
    });
  });

  it("네트워크가 실패하면 last-known-good 캐시로 재생한다", async () => {
    const store = createMemoryStore();
    // 이전 실행이 캐시를 남겼다.
    await (await primedCache(store)).save(
      playlistFixture(["cached-poster"]),
      new Map([["sha:cached-poster", new Blob(["x"])]]),
    );

    const repositories = repositoriesWith(async () => {
      throw new Error("network down");
    });

    const { result } = renderHook(
      () =>
        useOfflinePlaylist("device-1", { store, preload: instantPreload }),
      { wrapper: makeWrapper(repositories) },
    );

    await waitFor(() => expect(result.current.source).toBe("cache"));
    expect(result.current.playlist?.posters).toHaveLength(1);
    expect(result.current.playlist?.posters[0]?.posterUrl).toMatch(/^blob:/);
  });

  it("캐시에서도 만료된 항목은 재생하지 않는다", async () => {
    const store = createMemoryStore();
    await (await primedCache(store)).save(
      playlistFixture(["expired"], { endInMs: -1000 }),
      new Map([["sha:expired", new Blob(["x"])]]),
    );

    const repositories = repositoriesWith(async () => {
      throw new Error("network down");
    });

    const { result } = renderHook(
      () =>
        useOfflinePlaylist("device-1", { store, preload: instantPreload }),
      { wrapper: makeWrapper(repositories) },
    );

    await waitFor(() => expect(result.current.source).toBe("cache"));
    expect(result.current.playlist?.posters).toHaveLength(0);
  });

  it("미디어 다운로드가 실패한 편성은 캐시로 승격하지 않는다", async () => {
    const store = createMemoryStore();
    const repositories = repositoriesWith(async () =>
      playlistFixture(["a"]),
    );

    const { result } = renderHook(
      () =>
        useOfflinePlaylist("device-1", {
          store,
          preload: {
            fetcher: async () => {
              throw new Error("cdn down");
            },
          },
        }),
      { wrapper: makeWrapper(repositories) },
    );

    await waitFor(() => expect(result.current.source).toBe("network"));
    // 승격 시도가 끝나기를 기다린 뒤에도 캐시는 비어 있어야 한다.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(await createPlaylistCache(store).load()).toBeNull();
  });

  it("캐시도 네트워크도 없으면 오류를 드러낸다", async () => {
    const store = createMemoryStore();
    const repositories = repositoriesWith(async () => {
      throw new Error("network down");
    });

    const { result } = renderHook(
      () => useOfflinePlaylist("device-1", { store }),
      { wrapper: makeWrapper(repositories) },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.playlist).toBeNull();
    expect(result.current.error).not.toBeNull();
  });
});
