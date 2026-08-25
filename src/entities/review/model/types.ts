/** 명세 6.4 Review, FR-REV-04 */
export const REVIEW_DECISIONS = ["APPROVED", "REJECTED"] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

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

export interface ReviewDto {
  id: string;
  submissionId: string;
  /** 검토 대상 신청 버전 */
  revision: number;
  decision: ReviewDecision;
  reasonCode: RejectionReasonCode | null;
  /** 게시자에게 공개되는 사유 */
  comment: string | null;
  reviewerId: string;
  reviewedAt: string;
}

export interface Review extends Omit<ReviewDto, "reviewedAt"> {
  reviewedAt: Date;
}
