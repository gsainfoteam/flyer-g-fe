import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { fromPlaylistItem } from "@/entities/poster";
import { selectPlayableItems } from "@/entities/playlist";
import type { Playlist } from "@/entities/playlist/model/types";
import { useRepositories } from "@/app/providers/repositories-context";
import {
  clampRefreshSeconds,
  type DisplayPlaylist,
} from "@/features/display/api/queries";
import { queryKeys } from "@/shared/api/query-keys";
import { computeBackoffMs } from "@/shared/network/backoff";
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
 * 캐시로 승격한다. 저장 실패는 화면을 중단시키지 않는다 — 캐시 없이 온라인
 * 전용으로 동작한다.
 *
 * **게시 기간은 시간이 흐르면서 다시 적용한다.** 네트워크가 끊기면 편성은 마지막
 * 응답에 멈춰 있지만 시간은 흐른다. 마지막으로 안 서버 시각에 흐른 시간을 더한
 * 시각으로 판정하고, 다음 시작·종료 시각에 맞춰 다시 거른다. 그러지 않으면
 * 오프라인 TV에 끝난 행사가 무기한 걸린다.
 */
export const CACHE_SCHEMA_VERSION = 1;
const CACHE_DB_NAME = "flyer-g-display";
/** 시각 경계가 멀어도 이 간격마다는 다시 판정한다. 기기 절전·시계 보정 대비 */
const MAX_BOUNDARY_WAIT_MS = 5 * 60 * 1000;

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
}

export interface UseOfflinePlaylistOptions {
  /** 테스트 주입용 */
  store?: KeyValueStore;
  preload?: PreloadOptions;
  /** 연속 실패 횟수로 다음 조회까지의 간격을 정한다. 기본은 지수 backoff. */
  backoffMs?: (baseMs: number, failureCount: number) => number;
}

interface TimedPlaylist {
  playlist: Playlist;
  /** 서버 시각 - 기기 시각 (ms). 이 값을 더하면 지금의 서버 시각이 된다. */
  clockOffsetMs: number;
}

export function useOfflinePlaylist(
  deviceId: string,
  options: UseOfflinePlaylistOptions = {},
): OfflinePlaylistResult {
  const { displays } = useRepositories();
  const { store: injectedStore, preload, backoffMs = computeBackoffMs } = options;

  const [cacheStore] = useState<Promise<KeyValueStore>>(() =>
    openVersionedStore(injectedStore ?? defaultStore(), CACHE_SCHEMA_VERSION),
  );
  const cacheRef = useRef<LoadedPlaylistCache | null>(null);
  const [cached, setCached] = useState<LoadedPlaylistCache | null>(null);

  // 연속 실패 횟수와 그에 맞춘 대기 시간. 조회가 시작될 때마다 초기화되는
  // TanStack의 fetchFailureCount 대신 오류·성공 누적 횟수로 직접 센다.
  // 대기 시간은 실패 횟수가 바뀔 때만 계산한다. jitter가 렌더마다 달라지면
  // polling timer가 매번 다시 걸려 영영 울리지 않는다.
  const backoffRef = useRef({ errorsAtLastSuccess: 0, failures: -1, delayMs: 0 });

  const query = useQuery({
    queryKey: queryKeys.displays.playlist(deviceId),
    queryFn: ({ signal }) => displays.getPlaylist(deviceId, signal),
    refetchInterval: (current) => {
      const { state } = current;
      const backoff = backoffRef.current;
      if (state.dataUpdatedAt >= state.errorUpdatedAt) {
        backoff.errorsAtLastSuccess = state.errorUpdateCount;
      }
      const failures = state.errorUpdateCount - backoff.errorsAtLastSuccess;
      const baseMs = clampRefreshSeconds(state.data?.refreshAfterSeconds) * 1000;
      if (failures !== backoff.failures) {
        backoff.failures = failures;
        backoff.delayMs = backoffMs(baseMs, failures);
      }
      return backoff.delayMs;
    },
    refetchIntervalInBackground: true,
    // 가려졌던 화면이 다시 보이면 바로 확인한다. 중단 지시를 늦게 반영하지 않게.
    refetchOnWindowFocus: "always",
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

  // 새 편성이 오면 미디어를 전부 검증한 뒤에만 승격한다. 저장은 한 번에 하나씩
  // 한다. 두 버전이 동시에 저장되면 늦게 끝난 쪽의 정리 단계가 다른 쪽 미디어를
  // 지운다. 기다리는 사이 더 새 편성이 왔으면 옛 편성은 건너뛴다.
  const promotedVersionRef = useRef<string | null>(null);
  const latestVersionRef = useRef<string | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    const playlist = query.data;
    if (!playlist) return;
    latestVersionRef.current = playlist.playlistVersion;
    if (promotedVersionRef.current === playlist.playlistVersion) return;
    promotedVersionRef.current = playlist.playlistVersion;

    saveChainRef.current = saveChainRef.current.then(async () => {
      if (latestVersionRef.current !== playlist.playlistVersion) return;
      try {
        const cache = createPlaylistCache(await cacheStore);
        const media = await preloadPlaylistMedia(playlist, {
          ...preload,
          reuse: preload?.reuse ?? cache.findMedia,
        });
        await cache.save(playlist, media);
      } catch {
        // 부분 다운로드는 승격하지 않는다. 기존 last-known-good이 유지된다.
        if (promotedVersionRef.current === playlist.playlistVersion) {
          promotedVersionRef.current = null;
        }
      }
    });
  }, [query.data, cacheStore, preload]);

  const { data, dataUpdatedAt, error, isPending, refetch } = query;

  const timed = useMemo((): TimedPlaylist | null => {
    if (data) {
      // dataUpdatedAt은 응답을 받은 기기 시각이다.
      return {
        playlist: data,
        clockOffsetMs: data.serverTime.getTime() - dataUpdatedAt,
      };
    }
    if (cached) {
      return { playlist: cached.playlist, clockOffsetMs: cached.clockOffsetMs };
    }
    return null;
  }, [data, dataUpdatedAt, cached]);

  const now = useServerNow(timed);

  return useMemo((): OfflinePlaylistResult => {
    const base = { refetch: () => void refetch() };

    if (data && timed && now) {
      return {
        ...base,
        source: "network",
        isPending: false,
        error: null,
        playlist: toDisplayPlaylist(data, now, (item) => item.assetUrl),
      };
    }

    if (cached && now) {
      return {
        ...base,
        source: "cache",
        isPending: false,
        error: null,
        // 미디어 blob이 사라진 항목은 방어적으로 제외한다.
        playlist: toDisplayPlaylist(cached.playlist, now, (item) =>
          cached.posterUrls.get(item.submissionId),
        ),
      };
    }

    return {
      ...base,
      source: null,
      isPending,
      error: isPending ? null : error,
      playlist: null,
    };
  }, [data, timed, now, cached, isPending, error, refetch]);
}

/**
 * 지금의 서버 시각. 편성 항목의 다음 시작·종료 시각이 되면 다시 계산해 화면이
 * 다시 걸러지게 한다. 편성이 바뀌면 그 편성의 기준으로 다시 맞춘다.
 */
function useServerNow(timed: TimedPlaylist | null): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    if (!timed) return;
    let timer: number | undefined;

    const update = () => {
      const current = new Date(Date.now() + timed.clockOffsetMs);
      setNow(current);

      const at = current.getTime();
      const next = timed.playlist.items
        .flatMap((item) => [item.startsAt.getTime(), item.endsAt.getTime()])
        .filter((time) => time > at)
        .reduce((earliest, time) => Math.min(earliest, time), Infinity);
      const wait = Math.min(MAX_BOUNDARY_WAIT_MS, next - at + 50);
      timer = window.setTimeout(update, wait);
    };

    update();
    return () => window.clearTimeout(timer);
  }, [timed]);

  return timed ? now : null;
}

function toDisplayPlaylist(
  playlist: Playlist,
  now: Date,
  resolveUrl: (item: Playlist["items"][number]) => string | undefined,
): DisplayPlaylist {
  const posters = selectPlayableItems(playlist, now).flatMap((item) => {
    const assetUrl = resolveUrl(item);
    return assetUrl ? [fromPlaylistItem({ ...item, assetUrl })] : [];
  });

  return {
    serverTime: now,
    playlistVersion: playlist.playlistVersion,
    refreshAfterSeconds: clampRefreshSeconds(playlist.refreshAfterSeconds),
    layout: playlist.layout,
    deviceName: playlist.deviceName,
    posters,
  };
}
