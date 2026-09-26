import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/shared/api/repositories-context";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import { normalizeApiError } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";
import { useIdempotencyKey } from "@/shared/lib/idempotency";

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
  // 취소 한 번에 key 하나. 응답을 못 받아 다시 눌러도 같은 요청으로 본다.
  const key = useIdempotencyKey();

  const mutation = useMutation<
    SignageSubmissionExpanded,
    ApiError,
    { version: number }
  >({
    // version은 화면이 본 신청의 버전이다. 그사이 바뀌었으면 서버가 409를 준다.
    mutationFn: async ({ version }) => {
      try {
        return await submissions.cancel(
          submissionId,
          { version },
          { idempotencyKey: key.current() },
        );
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
      // 승인 대기에서 빠지므로 관리자 목록과 배지도 다시 센다.
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all() });
    },
  });

  return { ...mutation, startAttempt: key.renew };
}
