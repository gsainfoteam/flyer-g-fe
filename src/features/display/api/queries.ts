import type { PosterRenderModel } from "@/entities/poster";
import type { LayoutType } from "@/entities/playlist/model/types";

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

/** 플레이어가 그리는 편성. 기간이 지난 항목은 이미 빠져 있다. */
export interface DisplayPlaylist {
  serverTime: Date;
  deviceName: string | null;
  playlistVersion: string;
  refreshAfterSeconds: number;
  layout: { type: LayoutType; rotationSeconds: number };
  posters: PosterRenderModel[];
}
