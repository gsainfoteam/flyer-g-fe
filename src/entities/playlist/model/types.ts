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

  /**
   * 아래 세 필드는 명세 8.3 예시에 없지만 Phase 05의 SINGLE 레이아웃이
   * 일시·장소·주최를 요구한다. 실제 계약 확정 시 조정한다.
   */
  subtitle?: string | null;
  location?: string | null;
  organizerName?: string | null;
}

export interface PlaylistDto {
  serverTime: string;
  /**
   * 이 편성을 받는 기기의 표시 이름("A동 로비"). TV 머리에 나온다. 기기는 기기 목록
   * API를 볼 수 없어서 편성 응답에 함께 받는다. (`API-REQUIREMENTS.md` 8절)
   */
  deviceName?: string | null;
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
  deviceName: string | null;
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
