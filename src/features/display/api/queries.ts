import { useQuery } from "@tanstack/react-query";
import { fromPlaylistItem } from "@/entities/poster";
import type { PosterRenderModel } from "@/entities/poster";
import { selectPlayableItems } from "@/entities/playlist";
import type { LayoutType } from "@/entities/playlist/model/types";
import { useRepositories } from "@/app/providers/repositories-context";
import { queryKeys } from "@/shared/api/query-keys";

/**
 * 서버 `refreshAfterSeconds`를 안전 범위로 좁힌다.
 *
 * 너무 짧으면 기기 수십 대가 서버를 두드리고, 너무 길면 중단 지시가 다음 동기화
 * 까지 TV에 남는다(명세 FR-REV-05). 서버 값이 이상해도 이 범위를 벗어나지 않는다.
 */
export const REFRESH_SECONDS = { min: 15, max: 300, fallback: 60 } as const;

export function clampRefreshSeconds(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return REFRESH_SECONDS.fallback;
  }
  return Math.min(REFRESH_SECONDS.max, Math.max(REFRESH_SECONDS.min, value));
}

export interface DisplayPlaylist {
  serverTime: Date;
  playlistVersion: string;
  refreshAfterSeconds: number;
  layout: { type: LayoutType; rotationSeconds: number };
  posters: PosterRenderModel[];
}

/**
 * 기기 편성 조회.
 *
 * 서버가 유효 편성을 주지만 클라이언트도 서버 시각 기준으로 만료 항목을 한 번 더
 * 걸러 낸다. (명세 FR-PLY-01)
 *
 * polling 주기는 서버 응답의 `refreshAfterSeconds`가 정한다. TV는 화면이 가려져도
 * (탭 전환 등) 계속 갱신해야 중단 지시가 제때 반영된다.
 *
 * 갱신 실패 시 마지막 데이터가 캐시에 남아 화면이 계속 재생된다. 영속 캐시
 * (새로고침·오프라인 생존)는 Phase 06 범위다.
 */
export function useDisplayPlaylist(deviceId: string) {
  const { displays } = useRepositories();

  return useQuery({
    queryKey: queryKeys.displays.playlist(deviceId),
    queryFn: ({ signal }) => displays.getPlaylist(deviceId, signal),
    select: (playlist): DisplayPlaylist => ({
      serverTime: playlist.serverTime,
      playlistVersion: playlist.playlistVersion,
      refreshAfterSeconds: clampRefreshSeconds(playlist.refreshAfterSeconds),
      layout: playlist.layout,
      posters: selectPlayableItems(playlist).map(fromPlaylistItem),
    }),
    refetchInterval: (query) =>
      clampRefreshSeconds(query.state.data?.refreshAfterSeconds) * 1000,
    refetchIntervalInBackground: true,
    // 실패해도 다음 주기에 다시 시도한다. 즉시 재시도 폭주를 만들지 않는다.
    retry: false,
  });
}
