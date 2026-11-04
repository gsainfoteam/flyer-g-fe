import { useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/shared/api/repositories-context";
import type {
  SignageSubmissionExpanded,
  SubmissionStatus,
} from "@/entities/submission";
import type { RejectionReasonCode } from "@/entities/review";
import { normalizeApiError } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";
import { runWithConflictRecovery } from "@/shared/api/recover-conflict";
import {
  createIdempotencyKey,
  useIdempotencyKey,
} from "@/shared/lib/idempotency";

/**
 * 검토 결정 (명세 FR-REV-03 ~ FR-REV-05).
 *
 * 승인·반려는 화면이 본 `revision`을 실어 보낸다. 다른 관리자가 먼저 처리했거나
 * 게시자가 그 사이 수정했으면 서버가 409로 거절한다. 중단은 급히 내리는 일이라
 * 계약상 revision 없이 사유만 보내고, 중단할 수 없는 상태면 서버가 409로 거절한다. 그때 화면은 성공을 가정하지
 * 않고, 낡은 화면에 남지도 않게 최신 상태를 다시 불러온다.
 *
 * 성공 응답의 상태(SCHEDULED/PUBLISHED 등)를 그대로 쓴다. 클라이언트가 시작
 * 시각을 보고 상태를 계산하지 않는다.
 *
 * 승인·반려의 idempotency key는 결정 한 번(다이얼로그를 연 한 번)에 하나다. 응답을 못 받아
 * 다시 누른 요청이 두 번 처리되지 않는다. 다이얼로그를 열 때 `startAttempt()`를 부른다.
 * 중단은 정리한 사유가 달라질 때만 새 key를 쓴다.
 * 그렇게 다시 보냈는데 첫 요청이 이미 처리되어 409가 오면, 최신 상태가 바라던
 * 결과인지 확인해 성공으로 본다(`runWithConflictRecovery`).
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
  /** 결정이 처리되면 신청이 가 있을 상태 */
  expected: readonly SubmissionStatus[],
  run: (
    variables: Variables,
    idempotencyKey: string,
  ) => Promise<SignageSubmissionExpanded>,
  identity?: (variables: Variables) => string,
) {
  const { submissions } = useRepositories();
  const key = useIdempotencyKey();
  const previousIdentity = useRef<string | null>(null);
  const refresh = useDecisionRefresh(submissionId);

  const mutation = useMutation<SignageSubmissionExpanded, ApiError, Variables>({
    mutationFn: async (variables) => {
      if (identity) {
        const next = identity(variables);
        if (previousIdentity.current !== next) key.renew();
        previousIdentity.current = next;
      }
      try {
        return await runWithConflictRecovery(
          () => run(variables, key.current()),
          {
            ...key,
            reload: () => submissions.getById(submissionId),
            succeeded: (latest) => expected.includes(latest.status),
          },
        );
      } catch (cause) {
        throw normalizeApiError(cause);
      }
    },
    onSuccess: (updated) => {
      key.renew();
      refresh.onSuccess(updated);
    },
    onError: refresh.onError,
  });

  return { ...mutation, startAttempt: key.renew };
}

export function useApproveSubmission(submissionId: string) {
  const { reviews } = useRepositories();
  return useDecision<{ revision: number }>(
    submissionId,
    ["APPROVED", "SCHEDULED", "PUBLISHED"],
    ({ revision }, key) =>
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
    ["REJECTED"],
    ({ revision, reasonCode, comment }, key) =>
      reviews.reject(
        { submissionId, revision, reasonCode, comment: comment.trim() },
        { idempotencyKey: key },
      ),
  );
}

export function useSuspendSubmission(submissionId: string) {
  const { reviews } = useRepositories();
  return useDecision<{ reason: string }>(
    submissionId,
    ["SUSPENDED"],
    ({ reason }, key) =>
      reviews.suspend(
        { submissionId, reason: reason.trim() },
        { idempotencyKey: key },
      ),
    ({ reason }) => reason.trim(),
  );
}

/** 심사 화면이 늦게 보내는 결정. 화면을 떠난 뒤에도 그대로 보낼 수 있게 값만 든다. */
export type QueuedDecision =
  | { kind: "approve"; submissionId: string; revision: number }
  | ({ kind: "reject"; submissionId: string } & RejectValues);

const EXPECTED_STATUS: Record<
  QueuedDecision["kind"],
  readonly SubmissionStatus[]
> = {
  approve: ["APPROVED", "SCHEDULED", "PUBLISHED"],
  reject: ["REJECTED"],
};

/**
 * 결정 하나를 보낸다. 심사 한 화면은 결정을 몇 초 늦게 보내므로(되돌리기), 보낼
 * 때 이미 다른 건을 보고 있다. 그래서 신청 id를 hook이 아니라 결정에 싣는다.
 * 재시도·409 확인 규칙은 위 `useDecision`과 같다.
 */
export function useSendDecision() {
  const { reviews, submissions } = useRepositories();
  const queryClient = useQueryClient();

  return useCallback(
    async (decision: QueuedDecision): Promise<SignageSubmissionExpanded> => {
      const key = createIdempotencyKey();
      let unknownOutcome = false;
      const { submissionId } = decision;
      const run = () =>
        decision.kind === "approve"
          ? reviews.approve(
              { submissionId, revision: decision.revision },
              { idempotencyKey: key },
            )
          : reviews.reject(
              {
                submissionId,
                revision: decision.revision,
                reasonCode: decision.reasonCode,
                comment: decision.comment.trim(),
              },
              { idempotencyKey: key },
            );
      try {
        const updated = await runWithConflictRecovery(run, {
          hadUnknownOutcome: () => unknownOutcome,
          markOutcomeUnknown: () => {
            unknownOutcome = true;
          },
          reload: () => submissions.getById(submissionId),
          succeeded: (latest) =>
            EXPECTED_STATUS[decision.kind].includes(latest.status),
        });
        queryClient.setQueryData(
          queryKeys.submissions.detail(submissionId),
          updated,
        );
        return updated;
      } catch (cause) {
        throw normalizeApiError(cause);
      } finally {
        // 성공이면 대기열에서 빠지고, 409면 화면이 본 것이 낡았다. 둘 다 새로 받는다.
        void queryClient.invalidateQueries({
          queryKey: queryKeys.reviews.all(),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.submissions.all(),
        });
      }
    },
    [queryClient, reviews, submissions],
  );
}
