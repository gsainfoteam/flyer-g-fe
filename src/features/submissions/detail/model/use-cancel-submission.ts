import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/app/providers/repositories-context";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import { normalizeApiError } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";
import { createIdempotencyKey } from "../../create/model/idempotency";

/**
 * 시작 전 신청 취소 (명세 FR-DASH-02).
 *
 * 게시가 이미 시작된 건은 서버가 거절한다. 화면은 미리 버튼을 숨기지만 그것이
 * 보안 경계는 아니다. optimistic update는 하지 않는다 — 취소는 실패했는데 화면이
 * 취소된 것처럼 보이면 사용자는 TV에 계속 나가는 것을 모른다.
 */
export function useCancelSubmission(submissionId: string) {
  const { submissions } = useRepositories();
  const queryClient = useQueryClient();

  return useMutation<SignageSubmissionExpanded, ApiError>({
    mutationFn: async () => {
      try {
        return await submissions.cancel(submissionId, {
          idempotencyKey: createIdempotencyKey(),
        });
      } catch (cause) {
        throw normalizeApiError(cause);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(
        queryKeys.submissions.detail(submissionId),
        updated,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.submissions.all(),
      });
    },
  });
}
