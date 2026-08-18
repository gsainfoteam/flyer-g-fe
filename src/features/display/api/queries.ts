import { useQuery } from "@tanstack/react-query";
import { fromPlaylistItem } from "@/entities/poster";
import type { PosterRenderModel } from "@/entities/poster";
import { selectPlayableItems } from "@/entities/playlist";
import type { LayoutType } from "@/entities/playlist/model/types";
import { useRepositories } from "@/app/providers/repositories-context";
import { queryKeys } from "@/shared/api/query-keys";

export interface DisplayPlaylist {
  serverTime: Date;
  playlistVersion: string;
  layout: { type: LayoutType; rotationSeconds: number };
  posters: PosterRenderModel[];
}

/**
 * 기기 편성 조회.
 *
 * 서버가 유효 편성을 주지만 클라이언트도 서버 시각 기준으로 만료 항목을 한 번 더
 * 걸러 낸다. (명세 FR-PLY-01)
 *
 * 기기 자격 증명, 갱신 주기, 오프라인 캐시는 Phase 05~06 범위다.
 */
export function useDisplayPlaylist(deviceId: string) {
  const { displays } = useRepositories();

  return useQuery({
    queryKey: queryKeys.displays.playlist(deviceId),
    queryFn: ({ signal }) => displays.getPlaylist(deviceId, signal),
    select: (playlist): DisplayPlaylist => ({
      serverTime: playlist.serverTime,
      playlistVersion: playlist.playlistVersion,
      layout: playlist.layout,
      posters: selectPlayableItems(playlist).map(fromPlaylistItem),
    }),
  });
}
