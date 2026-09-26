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

/** 명세 6.1 콘텐츠 유형. MVP는 POSTER만 사용한다. */
export const CONTENT_TYPES = ["POSTER", "VIDEO", "MESSAGE", "SYSTEM"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

/**
 * 명세 6.4 SignageSubmission. 서버와 주고받는 전송 모델이다.
 * 날짜는 ISO 8601 UTC 문자열이며 화면에서 직접 쓰지 않는다.
 */
export interface SignageSubmissionDto {
  id: string;
  ziggleNoticeId: string;
  requesterId: string;
  organizationId: string | null;
  type: ContentType;
  title: string;
  categoryId: string;
  assetId: string;
  detailUrl: string;
  startAt: string;
  endAt: string;
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
}

/** 전송 모델을 Date로 해석한 도메인 모델. 계산과 비교는 이 타입으로 한다. */
export interface SignageSubmission
  extends Omit<
    SignageSubmissionDto,
    "startAt" | "endAt" | "createdAt" | "updatedAt" | "submittedAt"
  > {
  startAt: Date;
  endAt: Date;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
}

/**
 * 목록·상세가 참조를 해소해 함께 내려주는 확장 표현.
 * 실제 API 계약이 확정되면(명세 15장 Ziggle 기술 연동) 이 경계에서 조정한다.
 */
export interface SignageSubmissionExpandedDto extends SignageSubmissionDto {
  categoryName: string;
  organizationName: string;
  posterUrl: string;
  subtitle: string | null;
  location: string | null;
  description: string | null;
}

export interface SignageSubmissionExpanded
  extends SignageSubmission,
    Omit<
      SignageSubmissionExpandedDto,
      keyof SignageSubmissionDto
    > {}

/**
 * 목록·카드·상세가 실제로 그리는 표시 모델.
 * assetId, categoryId 같은 참조가 해소된 뒤의 값만 담는다.
 */
export interface SubmissionView {
  id: string;
  title: string;
  subtitle: string | null;
  categoryName: string;
  organizationName: string;
  status: SubmissionStatus;
  startAt: Date;
  endAt: Date;
  createdAt: Date;
  /** 마지막으로 검토에 낸 시각. 관리자 목록의 대기 시간은 이 값으로 센다. */
  submittedAt: Date | null;
  /** 신청한 사람. 관리자가 남의 신청을 볼 때 게시자 행동을 숨기는 데 쓴다. */
  requesterId: string;
  posterUrl: string;
  detailUrl: string;
  location: string | null;
  description: string | null;
  /** 게시할 위치 묶음. 비어 있으면 모든 위치다. */
  targetGroupIds: string[];
  /** 화면이 본 버전. 취소·검토 요청에 실어 동시 수정 충돌을 판정한다. */
  version: number;
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
