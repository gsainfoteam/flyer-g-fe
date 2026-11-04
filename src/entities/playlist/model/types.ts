import type {
  EventBannerMode,
  EventBannerOccasion,
  StoryTag,
} from "@/entities/submission/model/types";

/**
 * TV 화면 전환 방식. 기기마다 운영자가 고른다.
 *
 * - `WALL`: 모아 보기 ↔ 하나씩 크게. 게시물을 비율 그대로 한 화면에 모은 벽을
 *   보여 준 뒤 몇 건을 하나씩 크게(QR 포함) 보여 주고 다시 벽으로 돌아간다.
 * - `STRIP`: 흐르는 띠. 게시물을 같은 높이로 한 줄에 이어 붙이고 한 칸씩 민다.
 *   가운데 한 건만 선명하고 아래에 제목과 QR이 나온다.
 */
export const LAYOUT_TYPES = ["WALL", "STRIP"] as const;
export type LayoutType = (typeof LAYOUT_TYPES)[number];

/**
 * 예전 레이아웃 값. 백엔드가 새 값으로 옮기기 전까지 읽을 때 바꿔 받는다.
 * 4분할은 여러 장을 한 화면에 보여 주므로 WALL, 단일은 한 건씩 보여 주므로 STRIP이다.
 */
const LEGACY_LAYOUT_TYPES: Record<string, LayoutType> = {
  FOUR_GRID: "WALL",
  SINGLE: "STRIP",
};

/** 서버가 보낸 레이아웃 값을 지금 값으로 읽는다. 모르는 값이면 null */
export function readLayoutType(value: string): LayoutType | null {
  if ((LAYOUT_TYPES as readonly string[]).includes(value)) {
    return value as LayoutType;
  }
  return LEGACY_LAYOUT_TYPES[value] ?? null;
}

export const DEFAULT_LAYOUT_TYPE: LayoutType = "WALL";

/** 콘텐츠 종류. 영상이면 `video`를 재생하고 `assetUrl`은 대표 프레임이다. */
export const CONTENT_KINDS = ["IMAGE", "VIDEO"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

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
  /**
   * 콘텐츠 종류와 원본 크기(px). 이미지를 받기 전에 비율로 배치를 정한다.
   * 이 필드가 생기기 전에 저장한 오프라인 캐시에는 없어서 선택으로 둔다.
   */
  kind?: ContentKind;
  width?: number;
  height?: number;
  /** 영상 길이(ms). 이미지는 null */
  durationMs?: number | null;
  /** 영상 포스터의 재생 파일(배포 ①). 이미지는 null */
  video?: PlaylistVideo | null;

  /** 신청자가 입력한 부제·장소·주최. 크게 보기와 흐르는 띠가 그린다. 없으면 null */
  subtitle?: string | null;
  location?: string | null;
  organizerName?: string | null;
}

export interface PlaylistVideo {
  /** TV 재생용 mp4. 받는 중이거나 재생에 실패하면 `assetUrl`(대표 프레임)을 띄운다. */
  url: string;
  /** 자동 재생은 음소거라 지금은 소리를 내지 않는다. */
  hasAudio: boolean;
}

/**
 * 편성 v2의 이벤트 배너 한 건(배포 ⑥). `photoUrl`·`assetUrl`은 TV용 이미지다. 미디어가
 * 없는 문구 배너도 있어 둘 다 null일 수 있다. `checksum`은 문구와 미디어로 정해진다.
 */
export interface PlaylistEventBannerDto {
  submissionId: string;
  revision: number;
  startsAt: string;
  endsAt: string;
  checksum: string;
  mode: EventBannerMode;
  occasion: EventBannerOccasion | null;
  recipient: string;
  /** 큰 문구. 이 칸이 생기기 전 배너는 null이다. */
  headline: string | null;
  message: string | null;
  sender: string | null;
  photoUrl: string | null;
  assetUrl: string | null;
}

/** 편성 v2의 제보 한 건. 작성자는 어디에도 실리지 않는다. */
export interface PlaylistStoryDto {
  submissionId: string;
  revision: number;
  startsAt: string;
  endsAt: string;
  checksum: string;
  storyNumber: number | null;
  tag: StoryTag;
  body: string;
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
  /** 예전 값(SINGLE·FOUR_GRID)이 남은 캐시도 있어 문자열로 받고 읽을 때 바꾼다. */
  layout: { type: string; rotationSeconds: number };
  items: PlaylistItemDto[];
  /** 편성 v2부터 있다. v1 응답과 예전 오프라인 캐시에는 없다. */
  eventBanners?: PlaylistEventBannerDto[];
  stories?: PlaylistStoryDto[];
}

export interface PlaylistEventBanner extends Omit<
  PlaylistEventBannerDto,
  "startsAt" | "endsAt"
> {
  startsAt: Date;
  endsAt: Date;
}

export interface PlaylistStory extends Omit<
  PlaylistStoryDto,
  "startsAt" | "endsAt"
> {
  startsAt: Date;
  endsAt: Date;
}

export interface PlaylistItem extends Omit<
  PlaylistItemDto,
  "startsAt" | "endsAt" | "kind" | "width" | "height" | "durationMs" | "video"
> {
  startsAt: Date;
  endsAt: Date;
  kind: ContentKind;
  /** 원본 크기(px). 모르면 0이고, 그리는 쪽이 세로 포스터 비율로 본다. */
  width: number;
  height: number;
  durationMs: number | null;
  video: PlaylistVideo | null;
}

export interface Playlist {
  /** 편성 판정의 기준 시각. 클라이언트 시계를 쓰지 않는다. */
  serverTime: Date;
  deviceName: string | null;
  playlistVersion: string;
  refreshAfterSeconds: number;
  layout: { type: LayoutType; rotationSeconds: number };
  items: PlaylistItem[];
  eventBanners: PlaylistEventBanner[];
  stories: PlaylistStory[];
}

/** 서버가 보낸 전환 간격을 안전 범위로 clamp한다. */
export function clampRotationSeconds(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return ROTATION_SECONDS.fallback;
  return Math.min(
    ROTATION_SECONDS.max,
    Math.max(ROTATION_SECONDS.min, Math.round(value)),
  );
}
