import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { fromPlaylistItem } from "@/entities/poster";
import { selectPlayableItems } from "@/entities/playlist";
import { useRepositories } from "@/app/providers/repositories-context";
import {
  clampRefreshSeconds,
  type DisplayPlaylist,
} from "@/features/display/api/queries";
import { queryKeys } from "@/shared/api/query-keys";
import {
  createIndexedDbStore,
  createMemoryStore,
  isIndexedDbAvailable,
  openVersionedStore,
} from "@/shared/storage";
import type { KeyValueStore } from "@/shared/storage";
import { createPlaylistCache } from "./playlist-cache";
import type { LoadedPlaylistCache } from "./playlist-cache";
import { preloadPlaylistMedia } from "./preload-media";
import type { PreloadOptions } from "./preload-media";

/**
 * 오프라인을 견디는 편성 (명세 FR-PLY-07).
 *
 * 선택 순서:
 * 1. 네트워크의 최신 유효 편성
 * 2. 마지막으로 검증 완료된 캐시 편성 (last-known-good)
 * 3. 없음 — 호출부가 브랜드 fallback을 그린다
 *
 * 네트워크 편성이 도착하면 백그라운드에서 미디어를 전부 내려받아 검증한 뒤에만
 * 캐시로 승격한다. 캐시에서도 게시 기간을 적용하며, 기기 시계 대신 마지막 서버
 * 시각과의 차이를 보정한 시각을 쓴다.
 *
 * 저장 실패는 화면을 중단시키지 않는다 — 캐시 없이 온라인 전용으로 동작한다.
 */
export const CACHE_SCHEMA_VERSION = 1;
const CACHE_DB_NAME = "flyer-g-display";

function defaultStore(): KeyValueStore {
  return isIndexedDbAvailable()
    ? createIndexedDbStore(CACHE_DB_NAME)
    : createMemoryStore();
}

export interface OfflinePlaylistResult {
  playlist: DisplayPlaylist | null;
  source: "network" | "cache" | null;
  /** 네트워크도 캐시도 아직 답이 없는 첫 로딩 */
  isPending: boolean;
  /** 보여줄 것이 아무것도 없는 실패 */
  error: unknown;
  refetch(): void;
  /** polling 실패 횟수. backoff 계산에 쓴다. */
  failureCount: number;
}

export interface UseOfflinePlaylistOptions {
  /** 테스트 주입용 */
  store?: KeyValueStore;
  preload?: PreloadOptions;
  /** polling 간격 계산. 기본은 서버 지시값. */
  refetchIntervalMs?: (base: number, failureCount: number) => number;
}

export function useOfflinePlaylist(
  deviceId: string,
  options: UseOfflinePlaylistOptions = {},
) {
  const { displays } = useRepositories();
  const { store: injectedStore, preload, refetchIntervalMs } = options;

  const [cacheStore] = useState<Promise<KeyValueStore>>(() =>
    openVersionedStore(injectedStore ?? defaultStore(), CACHE_SCHEMA_VERSION),
  );
  const cacheRef = useRef<LoadedPlaylistCache | null>(null);
  const [cached, setCached] = useState<LoadedPlaylistCache | null>(null);

  const query = useQuery({
    queryKey: queryKeys.displays.playlist(deviceId),
    queryFn: ({ signal }) => displays.getPlaylist(deviceId, signal),
    refetchInterval: (current) => {
      const base =
        clampRefreshSeconds(current.state.data?.refreshAfterSeconds) * 1000;
      return refetchIntervalMs
        ? refetchIntervalMs(base, current.state.fetchFailureCount)
        : base;
    },
    refetchIntervalInBackground: true,
    retry: false,
  });

  // 시작 시 캐시를 복원한다. 네트워크보다 먼저 도착하면 즉시 그린다.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const loaded = await createPlaylistCache(await cacheStore).load();
        if (!alive) {
          loaded?.release();
          return;
        }
        cacheRef.current?.release();
        cacheRef.current = loaded;
        setCached(loaded);
      } catch {
        // 저장소가 없거나 손상되어도 화면은 온라인 전용으로 계속 동작한다.
      }
    })();
    return () => {
      alive = false;
      cacheRef.current?.release();
      cacheRef.current = null;
    };
  }, [cacheStore]);

  // 새 편성이 오면 미디어를 전부 검증한 뒤에만 승격한다.
  const promotedVersionRef = useRef<string | null>(null);
  useEffect(() => {
    const playlist = query.data;
    if (!playlist || promotedVersionRef.current === playlist.playlistVersion) {
      return;
    }
    promotedVersionRef.current = playlist.playlistVersion;

    void (async () => {
      try {
        const media = await preloadPlaylistMedia(playlist, preload);
        await createPlaylistCache(await cacheStore).save(playlist, media);
      } catch {
        // 부분 다운로드는 승격하지 않는다. 기존 last-known-good이 유지된다.
        promotedVersionRef.current = null;
      }
    })();
  }, [query.data, cacheStore, preload]);

  const { data, error, isPending, failureCount, refetch } = query;
  const result = useMemo((): OfflinePlaylistResult => {
    const base = {
      refetch: () => void refetch(),
      failureCount,
    };

    const network = data;
    if (network) {
      return {
        ...base,
        source: "network",
        isPending: false,
        error: null,
        playlist: {
          serverTime: network.serverTime,
          playlistVersion: network.playlistVersion,
          refreshAfterSeconds: clampRefreshSeconds(network.refreshAfterSeconds),
          layout: network.layout,
          posters: selectPlayableItems(network).map(fromPlaylistItem),
        },
      };
    }

    if (cached) {
      return {
        ...base,
        source: "cache",
        isPending: false,
        error: null,
        playlist: toCachedDisplayPlaylist(cached),
      };
    }

    return {
      ...base,
      source: null,
      isPending,
      error: isPending ? null : error,
      playlist: null,
    };
  }, [data, error, isPending, failureCount, refetch, cached]);

  return result;
}

/**
 * 캐시 편성을 표시 모델로 바꾼다.
 * 시각은 기기 시계에 서버-기기 차이를 보정해 쓰고, 캐시에서도 만료를 적용한다.
 * 미디어 blob이 사라진 항목은 방어적으로 제외한다.
 */
function toCachedDisplayPlaylist(cached: LoadedPlaylistCache): DisplayPlaylist {
  const correctedNow = new Date(Date.now() + cached.clockOffsetMs);
  const playable = selectPlayableItems(cached.playlist, correctedNow).filter(
    (item) => cached.posterUrls.has(item.submissionId),
  );

  return {
    serverTime: correctedNow,
    playlistVersion: cached.playlist.playlistVersion,
    refreshAfterSeconds: clampRefreshSeconds(
      cached.playlist.refreshAfterSeconds,
    ),
    layout: cached.playlist.layout,
    posters: playable.map((item) =>
      fromPlaylistItem({
        ...item,
        assetUrl: cached.posterUrls.get(item.submissionId)!,
      }),
    ),
  };
}
