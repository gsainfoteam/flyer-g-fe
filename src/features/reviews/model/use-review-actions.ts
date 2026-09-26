import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/shared/api/repositories-context";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import type { RejectionReasonCode } from "@/entities/review";
import { normalizeApiError } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";
import { useIdempotencyKey } from "@/shared/lib/idempotency";

/**
 * 검토 결정 (명세 FR-REV-03 ~ FR-REV-05).
 *
 * 모든 결정은 화면이 본 `revision`을 실어 보낸다. 다른 관리자가 먼저 처리했거나
 * 게시자가 그 사이 수정했으면 서버가 409로 거절한다. 그때 화면은 성공을 가정하지
 * 않고, 낡은 화면에 남지도 않게 최신 상태를 다시 불러온다.
 *
 * 성공 응답의 상태(SCHEDULED/PUBLISHED 등)를 그대로 쓴다. 클라이언트가 시작
 * 시각을 보고 상태를 계산하지 않는다.
 *
 * idempotency key는 결정 한 번(다이얼로그를 연 한 번)에 하나다. 응답을 못 받아
 * 다시 누른 요청이 두 번 처리되지 않는다. 다이얼로그를 열 때 `startAttempt()`를 부른다.
 */
function useDecisionRefresh(submissionId: string) {
  const queryClient = useQueryClient();

  const refreshLists = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all() });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.submissions.all(),
    });
  };

  return {
    onSuccess: (updated: SignageSubmissionExpanded) => {
      queryClient.setQueryData(
        queryKeys.submissions.detail(submissionId),
        updated,
      );
      refreshLists();
    },
    onError: (error: ApiError) => {
      // 409면 화면이 본 것이 이미 낡았다. 상세·이력·목록을 새로 받는다.
      if (error.code === "CONFLICT") refreshLists();
    },
  };
}

function useDecision<Variables>(
  submissionId: string,
  run: (variables: Variables, idempotencyKey: string) => Promise<SignageSubmissionExpanded>,
) {
  const key = useIdempotencyKey();
  const refresh = useDecisionRefresh(submissionId);

  const mutation = useMutation<SignageSubmissionExpanded, ApiError, Variables>({
    mutationFn: async (variables) => {
      try {
        return await run(variables, key.current());
      } catch (cause) {
        throw normalizeApiError(cause);
      }
    },
    onSuccess: refresh.onSuccess,
    onError: refresh.onError,
  });

  return { ...mutation, startAttempt: key.renew };
}

export function useApproveSubmission(submissionId: string) {
  const { reviews } = useRepositories();
  return useDecision<{ revision: number }>(submissionId, ({ revision }, key) =>
    reviews.approve({ submissionId, revision }, { idempotencyKey: key }),
  );
}

export interface RejectValues {
  revision: number;
  reasonCode: RejectionReasonCode;
  /** 게시자에게 공개되는 사유. 빈 값은 화면과 서버가 모두 거절한다. */
  comment: string;
}

export function useRejectSubmission(submissionId: string) {
  const { reviews } = useRepositories();
  return useDecision<RejectValues>(
    submissionId,
    ({ revision, reasonCode, comment }, key) =>
      reviews.reject(
        { submissionId, revision, reasonCode, comment: comment.trim() },
        { idempotencyKey: key },
      ),
  );
}

export function useSuspendSubmission(submissionId: string) {
  const { reviews } = useRepositories();
  return useDecision<{ reason: string }>(submissionId, ({ reason }, key) =>
    reviews.suspend(
      { submissionId, reason: reason.trim() },
      { idempotencyKey: key },
    ),
  );
}
