import { parseIsoUtc } from "@/shared/lib/datetime";
import { SUBMISSION_KINDS } from "./kind";
import type { SubmissionKind } from "./kind";
import { resolveEffectiveStatus } from "./schedule";
import { SUBMISSION_STATUSES } from "./types";
import type {
  KindQueueSummary,
  SignageSubmission,
  SignageSubmissionExpanded,
  SignageSubmissionExpandedDto,
  SubmissionStatus,
  SubmissionSummary,
  SubmissionView,
} from "./types";

/**
 * 운영 요약 통계 (명세 FR-DASH-01).
 * 모든 수치가 같은 목록과 같은 기준 시각에서 나오도록 한 번에 계산한다.
 * 노출 통계는 수집 API가 확정되기 전까지 만들지 않는다.
 */
export function summarizeSubmissions(
  submissions: readonly SignageSubmission[],
  serverNow: Date,
): SubmissionSummary {
  const byStatus = Object.fromEntries(
    SUBMISSION_STATUSES.map((status) => [status, 0]),
  ) as Record<SubmissionStatus, number>;
  for (const submission of submissions) {
    byStatus[resolveEffectiveStatus(submission, serverNow)] += 1;
  }

  const byType = Object.fromEntries(
    SUBMISSION_KINDS.map((kind) => {
      const waiting = submissions
        .filter(
          (submission) =>
            submission.type === kind &&
            resolveEffectiveStatus(submission, serverNow) === "PENDING_REVIEW",
        )
        .map((submission) => submission.submittedAt ?? submission.createdAt);
      return [
        kind,
        {
          pendingReview: waiting.length,
          oldestSubmittedAt:
            waiting.length > 0
              ? new Date(Math.min(...waiting.map((date) => date.getTime())))
              : null,
        },
      ];
    }),
  ) as Record<SubmissionKind, KindQueueSummary>;

  return {
    calculatedAt: serverNow,
    total: submissions.length - byStatus.ARCHIVED,
    published: byStatus.PUBLISHED,
    scheduled: byStatus.SCHEDULED,
    pendingReview: byStatus.PENDING_REVIEW,
    ended: byStatus.ENDED,
    byStatus,
    byType,
  };
}

/** 확장 전송 모델 → 확장 도메인 모델 */
export function toSignageSubmissionExpanded(
  dto: SignageSubmissionExpandedDto,
): SignageSubmissionExpanded {
  return {
    ...dto,
    startAt: dto.startAt ? parseIsoUtc(dto.startAt) : null,
    endAt: dto.endAt ? parseIsoUtc(dto.endAt) : null,
    createdAt: parseIsoUtc(dto.createdAt),
    updatedAt: parseIsoUtc(dto.updatedAt),
    submittedAt: dto.submittedAt ? parseIsoUtc(dto.submittedAt) : null,
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
    type: submission.type,
    title: submission.title,
    subtitle: submission.subtitle,
    categoryName: submission.categoryName,
    organizerName: submission.organizerName,
    status: resolveEffectiveStatus(submission, serverNow),
    startAt: submission.startAt,
    endAt: submission.endAt,
    createdAt: submission.createdAt,
    submittedAt: submission.submittedAt,
    requesterId: submission.requesterId,
    requesterName: submission.requesterName,
    posterUrl: submission.posterUrl,
    posterThumbUrl: submission.posterThumbUrl,
    posterWidth: submission.posterWidth,
    posterHeight: submission.posterHeight,
    posterKind: submission.posterKind,
    posterDurationMs: submission.posterDurationMs,
    posterVideoUrl: submission.posterVideoUrl,
    eventBanner: submission.eventBanner,
    story: submission.story,
    detailUrl: submission.detailUrl,
    location: submission.location,
    description: submission.description,
    targetGroupIds: submission.targetGroupIds,
    version: submission.version,
    lastDecision: submission.lastDecision,
  };
}
