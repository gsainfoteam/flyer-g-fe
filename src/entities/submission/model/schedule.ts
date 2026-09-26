import type { SignageSubmission, SubmissionStatus } from "./types";

/**
 * 편성 판정 규칙 (명세 6.3, FR-PLY-01)
 *
 * - 판정 기준 시각은 클라이언트 시계가 아니라 서버가 준 시각이다.
 * - 상태 문자열만 믿지 않고 승인 여부와 기간 조건을 함께 검증한다.
 * - `now >= endAt`이면 승인 여부와 관계없이 디스플레이에 포함하지 않는다.
 */

/** 기간 계산의 대상이 되는, 승인을 마친 상태들 */
const APPROVED_STATUSES: readonly SubmissionStatus[] = [
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
];

export type SchedulableSubmission = Pick<
  SignageSubmission,
  "status" | "startAt" | "endAt"
>;

export function isApprovedStatus(status: SubmissionStatus): boolean {
  return APPROVED_STATUSES.includes(status);
}

export function isWithinPeriod(
  submission: SchedulableSubmission,
  serverNow: Date,
): boolean {
  const now = serverNow.getTime();
  return now >= submission.startAt.getTime() && now < submission.endAt.getTime();
}

/**
 * 저장된 상태와 기간을 함께 본 실제 상태.
 * 승인 계열 상태만 시각으로 다시 판정하고, 나머지는 서버 상태를 그대로 존중한다.
 */
export function resolveEffectiveStatus(
  submission: SchedulableSubmission,
  serverNow: Date,
): SubmissionStatus {
  if (!isApprovedStatus(submission.status)) return submission.status;

  const now = serverNow.getTime();
  if (now < submission.startAt.getTime()) return "SCHEDULED";
  if (now < submission.endAt.getTime()) return "PUBLISHED";
  return "ENDED";
}
