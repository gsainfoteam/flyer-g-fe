import { parseIsoUtc, toIsoUtc } from "@/shared/lib/datetime";
import { resolveEffectiveStatus } from "./schedule";
import type {
  SignageSubmission,
  SignageSubmissionDto,
  SignageSubmissionExpanded,
  SignageSubmissionExpandedDto,
  SubmissionSummary,
  SubmissionView,
} from "./types";

/** 전송 모델 → 도메인 모델. 날짜 해석은 이 경계에서만 한다. */
export function toSignageSubmission(
  dto: SignageSubmissionDto,
): SignageSubmission {
  return {
    ...dto,
    startAt: parseIsoUtc(dto.startAt),
    endAt: parseIsoUtc(dto.endAt),
    createdAt: parseIsoUtc(dto.createdAt),
    updatedAt: parseIsoUtc(dto.updatedAt),
  };
}

/** 도메인 모델 → 전송 모델. */
export function toSignageSubmissionDto(
  submission: SignageSubmission,
): SignageSubmissionDto {
  return {
    ...submission,
    startAt: toIsoUtc(submission.startAt),
    endAt: toIsoUtc(submission.endAt),
    createdAt: toIsoUtc(submission.createdAt),
    updatedAt: toIsoUtc(submission.updatedAt),
  };
}

/**
 * 운영 요약 통계 (명세 FR-DASH-01).
 * 모든 수치가 같은 목록과 같은 기준 시각에서 나오도록 한 번에 계산한다.
 * 노출 통계는 수집 API가 확정되기 전까지 만들지 않는다.
 */
export function summarizeSubmissions(
  submissions: readonly SignageSubmission[],
  serverNow: Date,
): SubmissionSummary {
  const summary: SubmissionSummary = {
    calculatedAt: serverNow,
    total: submissions.length,
    published: 0,
    scheduled: 0,
    pendingReview: 0,
    ended: 0,
  };

  for (const submission of submissions) {
    switch (resolveEffectiveStatus(submission, serverNow)) {
      case "PUBLISHED":
        summary.published += 1;
        break;
      case "SCHEDULED":
        summary.scheduled += 1;
        break;
      case "PENDING_REVIEW":
        summary.pendingReview += 1;
        break;
      case "ENDED":
        summary.ended += 1;
        break;
      default:
        break;
    }
  }

  return summary;
}

/** 확장 전송 모델 → 확장 도메인 모델 */
export function toSignageSubmissionExpanded(
  dto: SignageSubmissionExpandedDto,
): SignageSubmissionExpanded {
  return {
    ...dto,
    startAt: parseIsoUtc(dto.startAt),
    endAt: parseIsoUtc(dto.endAt),
    createdAt: parseIsoUtc(dto.createdAt),
    updatedAt: parseIsoUtc(dto.updatedAt),
  };
}

/**
 * 도메인 모델 → 화면 표시 모델.
 * 상태는 저장된 값이 아니라 기간까지 반영한 실제 상태를 쓴다.
 */
export function toSubmissionView(
  submission: SignageSubmissionExpanded,
  serverNow: Date,
): SubmissionView {
  return {
    id: submission.id,
    title: submission.title,
    subtitle: submission.subtitle,
    categoryName: submission.categoryName,
    organizationName: submission.organizationName,
    status: resolveEffectiveStatus(submission, serverNow),
    startAt: submission.startAt,
    endAt: submission.endAt,
    createdAt: submission.createdAt,
    posterUrl: submission.posterUrl,
    detailUrl: submission.detailUrl,
    location: submission.location,
    description: submission.description,
    targetGroupIds: submission.targetGroupIds,
    version: submission.version,
  };
}
