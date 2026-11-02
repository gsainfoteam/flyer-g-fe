/** 명세 6.3 상태 모델. 서버 내부 상태와 1:1 대응한다. */
export const SUBMISSION_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "REJECTED",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "ENDED",
  "SUSPENDED",
  "CANCELED",
  "ARCHIVED",
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** 검토자의 결정. 처리 이력(`entities/review`)의 결정과 같은 값이다. */
export const SUBMISSION_DECISIONS = [
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;
export type SubmissionDecision = (typeof SUBMISSION_DECISIONS)[number];

import type { SubmissionKind } from "./kind";

/** 포스터 파일 종류 (배포 ①). 영상이면 `posterVideoUrl`로 재생한다. */
export const POSTER_KINDS = ["IMAGE", "VIDEO"] as const;
export type PosterKind = (typeof POSTER_KINDS)[number];

/** 이벤트 배너 형식 (배포 ③). 문구로 만들기 / 이미지 올리기 */
export const EVENT_BANNER_MODES = ["TEMPLATE", "IMAGE"] as const;
export type EventBannerMode = (typeof EVENT_BANNER_MODES)[number];

export const EVENT_BANNER_OCCASIONS = [
  "BIRTHDAY",
  "ADMISSION",
  "AWARD",
  "WELCOME",
  "OTHER",
] as const;
export type EventBannerOccasion = (typeof EVENT_BANNER_OCCASIONS)[number];

/**
 * 이벤트 배너 내용. 입력과 같은 필드에 서버가 만든 미리보기 주소를 더한다.
 * TEMPLATE은 TV가 문구로 그리고 사진은 선택, IMAGE는 올린 이미지를 그대로 띄운다.
 */
export interface EventBanner {
  mode: EventBannerMode;
  occasion: EventBannerOccasion | null;
  recipient: string;
  message: string | null;
  sender: string | null;
  /** TEMPLATE의 사진. 없으면 null */
  photoAssetId: string | null;
  photoUrl: string | null;
  /** 사진에 나온 사람의 동의. 사진이 있으면 true여야 한다. */
  photoConsent: boolean;
  /** IMAGE의 배너 이미지. TEMPLATE이면 null */
  assetId: string | null;
  assetUrl: string | null;
}

/** 소식 제보 말머리 (배포 ④) */
export const STORY_TAGS = [
  "NEWS",
  "PRAISE",
  "LOST_FOUND",
  "SUGGESTION",
  "OTHER",
] as const;
export type StoryTag = (typeof STORY_TAGS)[number];

/**
 * 제보 작성자. 운영자만 열람한다(`reveal-author`). 열람할 때마다 서버가 감사
 * 로그를 남긴다. TV·편성·다른 화면 어디에도 싣지 않는다.
 */
export interface StoryAuthor {
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
}

/** 지금 게시 중인 제보 한 건. 공개 목록이라 작성자와 신청 id는 없다. */
export interface RecentStory {
  storyNumber: number;
  tag: StoryTag;
  body: string;
  /** 승인되어 걸린 시각 */
  startAt: Date;
}

/** 소식 제보 내용. 번호는 승인 때 정해진다(승인 전·반려는 null). */
export interface Story {
  tag: StoryTag;
  body: string;
  storyNumber: number | null;
}

/**
 * 명세 6.4 SignageSubmission. 서버와 주고받는 전송 모델이다.
 * 날짜는 ISO 8601 UTC 문자열이며 화면에서 직접 쓰지 않는다.
 * (백엔드 `SubmissionDto`, `API-CHANGES-BACKEND.md` 5.1)
 *
 * 신청 종류(`type`)가 셋이 되면서(배포 ②③④) 포스터 전용 필드는 포스터가 아니면
 * null이다. 승인 전 제보는 기간이 null이고, 제보는 작성자 본인이 아니면(검토자
 * 포함) 신청자가 null이다.
 */
export interface SignageSubmissionDto {
  id: string;
  /** `detailUrl`이 Ziggle 공지 주소일 때 서버가 뽑은 공지 ID. 아니면 null */
  ziggleNoticeId: string | null;
  /** 제보는 작성자 본인이 아니면 null. 운영자는 작성자 열람으로 확인한다. */
  requesterId: string | null;
  type: SubmissionKind;
  /** 포스터는 신청자가 쓰고, 다른 종류는 서버가 목록용으로 만든다("생일 · 지민에게"). */
  title: string;
  /** 포스터만. 다른 종류는 null */
  categoryId: string | null;
  /** 포스터 asset. 포스터가 아니면 null */
  assetId: string | null;
  /** QR이 가리킬 상세 링크. 포스터만, 없으면 QR 없이 게시한다. */
  detailUrl: string | null;
  /** 승인 때 기간을 정하는 종류(제보)는 승인 전까지 null */
  startAt: string | null;
  endAt: string | null;
  status: SubmissionStatus;
  priority: number;
  targetGroupIds: string[];
  createdAt: string;
  updatedAt: string;
  /**
   * 마지막으로 검토에 낸 시각. 한 번도 내지 않은 DRAFT는 null이다. 반려 뒤 다시
   * 내면 그 시각으로 바뀐다. 관리자 목록의 "며칠째 기다림"은 이 값으로 센다 —
   * 초안을 만든 시각으로 세면 오래 고민한 신청이 오래 기다린 것처럼 보인다.
   */
  submittedAt: string | null;
  version: number;
  /**
   * 가장 최근 검토 결정. 한 번도 검토되지 않았으면 null이다. 검토 대기 건이
   * 처음 낸 것인지, 반려·중단 뒤 고쳐서 다시 낸 것인지 가른다.
   * (`API-FOLLOWUP-2026-09-30.md` 1-1. 백엔드가 아직 주지 않으면 null로 읽는다.)
   */
  lastDecision: SubmissionDecision | null;
}

/** 전송 모델을 Date로 해석한 도메인 모델. 계산과 비교는 이 타입으로 한다. */
export interface SignageSubmission extends Omit<
  SignageSubmissionDto,
  "startAt" | "endAt" | "createdAt" | "updatedAt" | "submittedAt"
> {
  startAt: Date | null;
  endAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
}

/**
 * 목록·상세가 참조를 해소하고, 신청자가 직접 입력한 표시 정보를 함께 내려주는 표현.
 * 백엔드는 모든 신청 응답에 이 필드들을 싣는다.
 */
export interface SignageSubmissionExpandedDto extends SignageSubmissionDto {
  /** 포스터만. 다른 종류는 null */
  categoryName: string | null;
  /** 신청자 이름. `requesterId`와 같은 규칙으로 null일 수 있다. */
  requesterName: string | null;
  /** 포스터 미리보기 (1280x1280 안). 영상은 대표 프레임. 포스터가 아니면 null */
  posterUrl: string | null;
  /** 포스터 썸네일 (400x400 안). 목록 카드용. 포스터가 아니면 null */
  posterThumbUrl: string | null;
  /** 포스터 원본 크기(px). 미리보기는 줄인 이미지라 해상도 판단은 이 값으로 한다. */
  posterWidth: number | null;
  posterHeight: number | null;
  /** 이미지·영상. 포스터가 아니면 null */
  posterKind: PosterKind | null;
  /** 영상 포스터의 길이(ms)와 재생용 mp4. 이미지거나 포스터가 아니면 null */
  posterDurationMs: number | null;
  posterVideoUrl: string | null;
  /** 이벤트 배너의 내용. 다른 종류는 null */
  eventBanner: EventBanner | null;
  /** 소식 제보의 내용. 다른 종류는 null */
  story: Story | null;
  /** 주최. 신청자가 자유 입력한다. 조직 모델은 없다. */
  organizerName: string | null;
  subtitle: string | null;
  location: string | null;
  description: string | null;
}

export interface SignageSubmissionExpanded
  extends
    SignageSubmission,
    Omit<SignageSubmissionExpandedDto, keyof SignageSubmissionDto> {}

/**
 * 목록·카드·상세가 실제로 그리는 표시 모델.
 * assetId, categoryId 같은 참조가 해소된 뒤의 값만 담는다.
 */
export interface SubmissionView {
  id: string;
  type: SubmissionKind;
  title: string;
  subtitle: string | null;
  /** 포스터만. 다른 종류는 null */
  categoryName: string | null;
  organizerName: string | null;
  status: SubmissionStatus;
  /** 승인 전 제보는 null */
  startAt: Date | null;
  endAt: Date | null;
  createdAt: Date;
  /** 마지막으로 검토에 낸 시각. 관리자 목록의 대기 시간은 이 값으로 센다. */
  submittedAt: Date | null;
  /**
   * 신청한 사람. 관리자가 남의 신청을 볼 때 게시자 행동을 숨기는 데 쓴다.
   * 제보는 작성자 본인이 아니면 null이다.
   */
  requesterId: string | null;
  requesterName: string | null;
  /** 포스터가 아니면 null */
  posterUrl: string | null;
  posterThumbUrl: string | null;
  /** 포스터 원본 크기(px). 포스터가 아니면 null */
  posterWidth: number | null;
  posterHeight: number | null;
  posterKind: PosterKind | null;
  posterDurationMs: number | null;
  posterVideoUrl: string | null;
  eventBanner: EventBanner | null;
  story: Story | null;
  detailUrl: string | null;
  location: string | null;
  description: string | null;
  /** 게시할 위치 묶음. 비어 있으면 모든 위치다. */
  targetGroupIds: string[];
  /** 화면이 본 버전. 취소·검토 요청에 실어 동시 수정 충돌을 판정한다. */
  version: number;
  /** 가장 최근 검토 결정. 검토된 적 없으면 null */
  lastDecision: SubmissionDecision | null;
}

export interface SubmissionSummary {
  /** 통계의 기준 시각. 명세 FR-DASH-01 */
  calculatedAt: Date;
  /** 보관(ARCHIVED)을 뺀 전체 */
  total: number;
  published: number;
  scheduled: number;
  pendingReview: number;
  ended: number;
  /**
   * 서버 시각 기준 실제 상태별 건수. 목록 탭의 건수와 "고쳐야 할 신청" 같은
   * 묶음 숫자를 여기서 낸다. 화면이 불러온 한 페이지로 세면 틀린다.
   * (`API-REQUIREMENTS.md` 7.1)
   */
  byStatus: Record<SubmissionStatus, number>;
  /** 종류별 검토 대기 건수와 가장 오래 기다린 건의 제출 시각(배포 ②) */
  byType: Record<SubmissionKind, KindQueueSummary>;
}

export interface KindQueueSummary {
  pendingReview: number;
  /** 대기 건이 없으면 null */
  oldestSubmittedAt: Date | null;
}

export interface SubmissionListParams {
  status?: SubmissionStatus | "ALL";
  /**
   * 복수 상태 필터. 목록 탭 하나가 상태 여러 개를 묶는다("승인/예약").
   * `status`와 함께 오면 이쪽이 우선한다. 빈 배열은 필터 없음과 같다.
   */
  statuses?: readonly SubmissionStatus[];
  /** 본인 신청만 볼지 전체를 볼지. 명세 3.2 권한 매트릭스 */
  scope?: "me" | "all";
  /** 종류 필터(배포 ②). 비우면 모든 종류다. */
  types?: readonly SubmissionKind[];
  cursor?: string | null;
  limit?: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  totalCount: number;
  /**
   * 이 응답을 만든 서버 시각.
   *
   * 상태와 기간 판정은 클라이언트 시계가 아니라 이 값을 기준으로 한다.
   * 목록과 요약이 서로 다른 시각을 쓰면 같은 건이 화면마다 다른 상태로 보인다.
   * (명세 6.3)
   */
  serverTime: Date;
}
