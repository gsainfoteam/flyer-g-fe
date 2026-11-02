import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import { normalizeApiError } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";
import type {
  CreateEventBannerInput,
  CreateStoryInput,
} from "@/shared/api/repositories";
import { useRepositories } from "@/shared/api/repositories-context";
import { createIdempotencyKey } from "@/shared/lib/idempotency";

/**
 * 이벤트 배너·소식 제보 제출 (배포 ③④). 포스터처럼 만들면 바로 검토 대기다.
 *
 * 시도 하나에 key 하나다. 응답을 못 받아 다시 누르면 같은 key로 보내 두 건이 생기지
 * 않는다. 입력을 고치면 `markInputChanged`로 새 시도를 연다. 진행 중 여부는 ref로도
 * 들어 더블 클릭을 막는다. (`use-create-submission.ts`와 같은 규칙)
 */
export function useCreateContent() {
  const { submissions } = useRepositories();
  const queryClient = useQueryClient();
  const keyRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const mutation = useMutation<
    SignageSubmissionExpanded,
    ApiError,
    CreateEventBannerInput | CreateStoryInput
  >({
    mutationFn: async (input) => {
      if (inFlightRef.current) {
        throw normalizeApiError(new DOMException("Aborted", "AbortError"));
      }
      inFlightRef.current = true;
      try {
        const key = (keyRef.current ??= createIdempotencyKey());
        return await submissions.createContent(input, { idempotencyKey: key });
      } catch (cause) {
        throw normalizeApiError(cause);
      } finally {
        inFlightRef.current = false;
      }
    },
    onSuccess: (created) => {
      keyRef.current = null;
      queryClient.setQueryData(
        queryKeys.submissions.detail(created.id),
        created,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.submissions.all(),
      });
    },
  });

  return {
    ...mutation,
    markInputChanged: () => {
      keyRef.current = null;
    },
  };
}
