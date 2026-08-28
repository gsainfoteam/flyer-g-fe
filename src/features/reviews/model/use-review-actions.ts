import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/app/providers/repositories-context";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import type { RejectionReasonCode } from "@/entities/review";
import { normalizeApiError } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";
import { createIdempotencyKey } from "@/features/submissions/create/model/idempotency";

/**
 * 검토 결정 (명세 FR-REV-03 ~ FR-REV-05).
 *
 * 모든 결정은 화면이 본 `revision`을 실어 보낸다. 다른 관리자가 먼저 처리했거나
 * 게시자가 그 사이 수정했으면 서버가 409로 거절하고, 화면은 성공을 가정하지 않고
 * 최신 상태를 다시 불러온다.
 *
 * 성공 응답의 상태(SCHEDULED/PUBLISHED 등)를 그대로 쓴다. 클라이언트가 시작
 * 시각을 보고 상태를 계산하지 않는다.
 */
function useDecisionInvalidation(submissionId: string) {
  const queryClient = useQueryClient();
  return (updated: SignageSubmissionExpanded) => {
    queryClient.setQueryData(queryKeys.submissions.detail(submissionId), updated);
    void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all() });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.submissions.all(),
    });
  };
}

export function useApproveSubmission(submissionId: string) {
  const { reviews } = useRepositories();
  const onDecided = useDecisionInvalidation(submissionId);

  return useMutation<SignageSubmissionExpanded, ApiError, { revision: number }>({
    mutationFn: async ({ revision }) => {
      try {
        return await reviews.approve(
          { submissionId, revision },
          { idempotencyKey: createIdempotencyKey() },
        );
      } catch (cause) {
        throw normalizeApiError(cause);
      }
    },
    onSuccess: onDecided,
  });
}

export interface RejectValues {
  revision: number;
  reasonCode: RejectionReasonCode;
  /** 게시자에게 공개되는 사유. 빈 값은 화면과 서버가 모두 거절한다. */
  comment: string;
}

export function useRejectSubmission(submissionId: string) {
  const { reviews } = useRepositories();
  const onDecided = useDecisionInvalidation(submissionId);

  return useMutation<SignageSubmissionExpanded, ApiError, RejectValues>({
    mutationFn: async ({ revision, reasonCode, comment }) => {
      try {
        return await reviews.reject(
          { submissionId, revision, reasonCode, comment: comment.trim() },
          { idempotencyKey: createIdempotencyKey() },
        );
      } catch (cause) {
        throw normalizeApiError(cause);
      }
    },
    onSuccess: onDecided,
  });
}

export function useSuspendSubmission(submissionId: string) {
  const { reviews } = useRepositories();
  const onDecided = useDecisionInvalidation(submissionId);

  return useMutation<SignageSubmissionExpanded, ApiError, { reason: string }>({
    mutationFn: async ({ reason }) => {
      try {
        return await reviews.suspend(
          { submissionId, reason: reason.trim() },
          { idempotencyKey: createIdempotencyKey() },
        );
      } catch (cause) {
        throw normalizeApiError(cause);
      }
    },
    onSuccess: onDecided,
  });
}
