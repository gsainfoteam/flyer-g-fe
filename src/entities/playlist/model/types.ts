/** 명세 8.3 재생 목록 응답, FR-PLY-02, FR-PLY-03 */
export const LAYOUT_TYPES = ["SINGLE", "FOUR_GRID"] as const;
export type LayoutType = (typeof LAYOUT_TYPES)[number];

export const FOUR_GRID_SLOT_COUNT = 4;

/** 명세 FR-PLY-03 전환 간격 안전 범위. 서버 값을 이 범위로 clamp한다. */
export const ROTATION_SECONDS = {
  min: 5,
  max: 60,
  fallback: 10,
} as const;

export interface PlaylistItemDto {
  submissionId: string;
  revision: number;
  title: string;
  category: string;
  assetUrl: string;
  /** QR이 가리킬 Ziggle 원문 주소. QR 값의 단일 원천이다. */
  detailUrl: string;
  startsAt: string;
  endsAt: string;
  priority: number;
  checksum: string;
}

export interface PlaylistDto {
  serverTime: string;
  playlistVersion: string;
  refreshAfterSeconds: number;
  layout: { type: LayoutType; rotationSeconds: number };
  items: PlaylistItemDto[];
}

export interface PlaylistItem
  extends Omit<PlaylistItemDto, "startsAt" | "endsAt"> {
  startsAt: Date;
  endsAt: Date;
}

export interface Playlist {
  /** 편성 판정의 기준 시각. 클라이언트 시계를 쓰지 않는다. */
  serverTime: Date;
  playlistVersion: string;
  refreshAfterSeconds: number;
  layout: { type: LayoutType; rotationSeconds: number };
  items: PlaylistItem[];
}

/** 서버가 보낸 전환 간격을 안전 범위로 clamp한다. */
export function clampRotationSeconds(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return ROTATION_SECONDS.fallback;
  return Math.min(
    ROTATION_SECONDS.max,
    Math.max(ROTATION_SECONDS.min, Math.round(value)),
  );
}
