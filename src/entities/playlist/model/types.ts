/** 명세 8.3 재생 목록 응답, FR-PLY-02, FR-PLY-03 */
export const LAYOUT_TYPES = ["SINGLE", "FOUR_GRID"] as const;
export type LayoutType = (typeof LAYOUT_TYPES)[number];

export const FOUR_GRID_SLOT_COUNT = 4;

/**
 * 관리자 미리보기용 예약 기기 id. 실제 기기가 아니라 지금 게시 중인 전체 포스터를
 * 보여준다. 편성 API는 기기 토큰이 있어야 하므로, 이 id는 로그인한 사용자의 게시 중
 * 신청 목록으로 편성을 만든다.
 */
export const PREVIEW_DEVICE_ID = "device-preview";

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
  /** QR이 가리킬 상세 링크. QR 값의 단일 원천이다. 없으면 QR 없이 그린다. */
  detailUrl: string | null;
  startsAt: string;
  endsAt: string;
  priority: number;
  checksum: string;

  /** 신청자가 입력한 부제·장소·주최. SINGLE 레이아웃이 그린다. 없으면 null */
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

export interface PlaylistItem extends Omit<
  PlaylistItemDto,
  "startsAt" | "endsAt"
> {
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
