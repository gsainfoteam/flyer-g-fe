import type { SubmissionStatus } from "./types";

/**
 * 상태 표현의 단일 원천. 화면에서 상태 문자열을 직접 한글로 바꾸지 않는다.
 * `tone`은 semantic 색 역할만 가리키며 실제 색은 디자인 토큰이 정한다.
 * 색만으로 상태를 구분하지 않도록 label을 항상 함께 노출한다. 명세 9.6
 */
export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusMeta {
  /** UI 표시 문구. 명세 6.3 */
  label: string;
  tone: StatusTone;
  /** 상태의 의미를 보조 설명이 필요할 때 쓴다. */
  description: string;
}

const STATUS_META: Record<SubmissionStatus, StatusMeta> = {
  DRAFT: {
    label: "작성 중",
    tone: "neutral",
    description: "제출 전 임시 저장 상태입니다.",
  },
  PENDING_REVIEW: {
    label: "승인 대기",
    tone: "warning",
    description: "관리자 검토를 기다리고 있습니다.",
  },
  REJECTED: {
    label: "반려됨",
    tone: "danger",
    description: "반려 사유를 확인한 뒤 수정해 재신청할 수 있습니다.",
  },
  APPROVED: {
    label: "승인됨",
    tone: "info",
    description: "승인이 완료되어 편성 계산을 기다립니다.",
  },
  SCHEDULED: {
    label: "예약됨",
    tone: "info",
    description: "게시 시작 시각을 기다리고 있습니다.",
  },
  PUBLISHED: {
    label: "게시 중",
    tone: "success",
    description: "현재 디스플레이에 노출될 수 있습니다.",
  },
  ENDED: {
    label: "종료됨",
    tone: "neutral",
    description: "게시 기간이 끝났습니다.",
  },
  SUSPENDED: {
    label: "게시 중단",
    tone: "danger",
    description: "관리자가 게시를 즉시 중단했습니다.",
  },
  CANCELED: {
    label: "신청 취소",
    tone: "neutral",
    description: "게시자가 시작 전에 신청을 취소했습니다.",
  },
  ARCHIVED: {
    label: "보관됨",
    tone: "neutral",
    description: "운영 목록에서 숨긴 종료 데이터입니다.",
  },
};

export function getStatusMeta(status: SubmissionStatus): StatusMeta {
  return STATUS_META[status];
}

export function getStatusLabel(status: SubmissionStatus): string {
  return STATUS_META[status].label;
}

/** 명세 6.3 허용 전이. 클라이언트는 버튼 노출 판단에만 쓰고 최종 판단은 서버가 한다. */
const ALLOWED_TRANSITIONS: Record<SubmissionStatus, readonly SubmissionStatus[]> =
  {
    DRAFT: ["PENDING_REVIEW"],
    PENDING_REVIEW: ["APPROVED", "REJECTED", "CANCELED"],
    REJECTED: ["PENDING_REVIEW", "CANCELED"],
    APPROVED: ["SCHEDULED", "PUBLISHED", "SUSPENDED"],
    SCHEDULED: ["PUBLISHED", "SUSPENDED", "CANCELED"],
    PUBLISHED: ["ENDED", "SUSPENDED"],
    ENDED: ["ARCHIVED"],
    SUSPENDED: ["PENDING_REVIEW", "APPROVED", "ENDED"],
    CANCELED: [],
    ARCHIVED: [],
  };

export function canTransition(
  from: SubmissionStatus,
  to: SubmissionStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function getAllowedTransitions(
  from: SubmissionStatus,
): readonly SubmissionStatus[] {
  return ALLOWED_TRANSITIONS[from];
}
