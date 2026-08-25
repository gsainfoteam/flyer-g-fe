import type { SubmissionStatus } from "./types";

/**
 * 상태 표현의 단일 원천. 화면에서 상태 문자열을 직접 한글로 바꾸지 않는다.
 *
 * tone은 두 가지뿐이다. 단색 체계라 상태마다 색을 나누지 않고, 게시자가
 * **고쳐야 하는 상태**만 강조색으로 띄운다. 나머지 구분은 label과 설명 문장이
 * 맡는다. (명세 9.6)
 */
export type StatusTone = "neutral" | "attention";

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
    tone: "neutral",
    description: "관리자 검토를 기다리고 있습니다.",
  },
  REJECTED: {
    label: "반려됨",
    tone: "attention",
    description: "반려 사유를 확인한 뒤 수정해 재신청할 수 있습니다.",
  },
  APPROVED: {
    label: "승인됨",
    tone: "neutral",
    description: "승인이 완료되어 편성 계산을 기다립니다.",
  },
  SCHEDULED: {
    label: "예약됨",
    tone: "neutral",
    description: "게시 시작 시각을 기다리고 있습니다.",
  },
  PUBLISHED: {
    label: "게시 중",
    tone: "neutral",
    description: "현재 디스플레이에 노출될 수 있습니다.",
  },
  ENDED: {
    label: "종료됨",
    tone: "neutral",
    description: "게시 기간이 끝났습니다.",
  },
  SUSPENDED: {
    label: "게시 중단",
    tone: "attention",
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

/**
 * 상태를 한 문장으로 설명한다.
 *
 * 배지의 짧은 label만으로는 "그래서 지금 어떻다는 건지"가 전해지지 않는다.
 * 목록과 상세에서 배지 옆에 이 문장을 함께 두어, 색을 구분하지 못해도 상황을
 * 알 수 있게 한다. (명세 9.6)
 *
 * 기간이 필요한 상태는 호출부가 formatter를 넘긴다. 날짜 표시 규칙을 이 모듈이
 * 알 필요가 없도록 하기 위한 것이다.
 */
export interface StatusSentenceInput {
  status: SubmissionStatus;
  /** "08. 25. 00:00" 같은 시작 시각 표시 */
  startsAtLabel?: string;
  /** "09. 02." 같은 종료일 표시 */
  endsAtLabel?: string;
  /** "3일" 같은 대기 경과 표시 */
  waitingLabel?: string;
}

export function getStatusSentence({
  status,
  startsAtLabel,
  endsAtLabel,
  waitingLabel,
}: StatusSentenceInput): string {
  switch (status) {
    case "DRAFT":
      return "아직 제출하지 않았어요";
    case "PENDING_REVIEW":
      return waitingLabel
        ? `${waitingLabel}째 관리자 검토를 기다리고 있어요`
        : "관리자 검토를 기다리고 있어요";
    case "REJECTED":
      return "관리자가 반려했어요 · 사유를 확인해 주세요";
    case "APPROVED":
      return "승인됐어요 · 편성을 계산하고 있어요";
    case "SCHEDULED":
      return startsAtLabel
        ? `${startsAtLabel}에 자동으로 걸려요`
        : "시작 시각이 되면 자동으로 걸려요";
    case "PUBLISHED":
      return endsAtLabel
        ? `TV에 나오고 있어요 · ~ ${endsAtLabel}`
        : "TV에 나오고 있어요";
    case "ENDED":
      return "게시 기간이 끝났어요";
    case "SUSPENDED":
      return "관리자가 게시를 중단했어요";
    case "CANCELED":
      return "신청을 취소했어요";
    case "ARCHIVED":
      return "보관했어요";
  }
}
