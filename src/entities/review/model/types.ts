import { parseIsoUtc } from "@/shared/lib/datetime";

/**
 * 신청 처리 이력 (명세 6.4 Review, FR-REV-04, FR-AUD-01의 표시 범위).
 *
 * 게시자가 "왜 지금 이 상태인지"를 시간 순으로 따라가려면 검토 결정만으로는
 * 모자란다. 언제 냈고, 반려 뒤 언제 다시 냈고, 언제 취소했는지도 있어야 한다.
 * 그래서 검토 결정과 게시자 행동을 한 줄의 이벤트로 받는다.
 * (`API-REQUIREMENTS.md` 6.4)
 *
 * SUSPENDED는 명세 6.4의 decision enum(APPROVED/REJECTED)에 없지만, 중단 사유를
 * 게시자에게 보여주려면(FR-REV-05) 여기에 함께 온다고 가정한다.
 */
export const SUBMISSION_EVENT_TYPES = [
  "SUBMITTED",
  "RESUBMITTED",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "CANCELED",
] as const;
export type SubmissionEventType = (typeof SUBMISSION_EVENT_TYPES)[number];

export const REJECTION_REASON_CODES = [
  "LOW_RESOLUTION",
  "ASPECT_RATIO",
  "INFO_MISMATCH",
  "INAPPROPRIATE",
  "PERIOD",
  "DUPLICATE",
  "OTHER",
] as const;
export type RejectionReasonCode = (typeof REJECTION_REASON_CODES)[number];

const REJECTION_REASON_LABELS: Record<RejectionReasonCode, string> = {
  LOW_RESOLUTION: "저해상도",
  ASPECT_RATIO: "비율 문제",
  INFO_MISMATCH: "정보 불일치",
  INAPPROPRIATE: "부적절한 내용",
  PERIOD: "기간 문제",
  DUPLICATE: "중복",
  OTHER: "기타",
};

export function getRejectionReasonLabel(code: RejectionReasonCode): string {
  return REJECTION_REASON_LABELS[code];
}

export interface SubmissionEventDto {
  id: string;
  submissionId: string;
  /** 이 일이 일어난 신청 버전 */
  revision: number;
  type: SubmissionEventType;
  /** 반려일 때만 */
  reasonCode: RejectionReasonCode | null;
  /** 게시자에게 공개되는 사유(반려·중단). 내부 메모는 오지 않는다. */
  comment: string | null;
  actorId: string;
  /** 한 사람의 표시 이름. ID만으로는 화면에 사람을 보여줄 수 없다. */
  actorName: string;
  occurredAt: string;
}

export interface SubmissionEvent extends Omit<SubmissionEventDto, "occurredAt"> {
  occurredAt: Date;
}

export function toSubmissionEvent(dto: SubmissionEventDto): SubmissionEvent {
  return { ...dto, occurredAt: parseIsoUtc(dto.occurredAt) };
}
