import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { useRepositories } from "@/app/providers/repositories-context";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import { queryKeys } from "@/shared/api/query-keys";
import { normalizeApiError } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { fromSeoulInput } from "@/shared/lib/datetime";
import { createIdempotencyKey } from "./idempotency";

/**
 * 게시 신청 생성 → 제출 (명세 FR-SUB-04).
 *
 * 두 단계를 하나의 시도로 묶는다. 생성은 성공했는데 제출이 실패한 경우 재시도하면
 * 새로 만들지 않고 이미 만든 신청을 제출한다. 그렇지 않으면 실패할 때마다 DRAFT가
 * 쌓인다.
 *
 * 기존 신청을 넘기면(수정·재신청, 명세 FR-DASH-02) 생성 대신 수정 → 제출한다.
 * REJECTED 건의 재제출도 같은 경로다.
 *
 * 서버가 이 둘을 한 번의 호출로 받는다면 여기만 바꾸면 된다.
 * (`API-REQUIREMENTS.md` 5절)
 */
export interface CreateSubmissionValues {
  ziggleNoticeId: string;
  title: string;
  categoryId: string;
  assetId: string;
  detailUrl: string;
  /** Asia/Seoul 벽시계 입력값 */
  startAt: string;
  endAt: string;
  targetGroupIds?: string[];
  /** 수정·재신청 대상. 있으면 create 대신 update한다. */
  editing?: { submissionId: string; version: number };
}

export function useCreateSubmission() {
  const { submissions } = useRepositories();
  const queryClient = useQueryClient();

  const idempotencyKeyRef = useRef<string | null>(null);
  /** 생성까지 끝난 신청. 제출만 실패했을 때 재사용한다. */
  const createdRef = useRef<SignageSubmissionExpanded | null>(null);
  /**
   * 진행 중 여부를 ref로 따로 둔다.
   *
   * `isPending`은 다시 렌더링된 뒤에야 true가 된다. 더블 클릭은 그 사이에 들어오므로
   * 상태만으로는 두 번째 클릭을 막지 못한다. (명세 FR-SUB-04)
   */
  const inFlightRef = useRef(false);

  /** 입력이 바뀌면 다른 시도다. 같은 key를 다른 내용으로 재사용하지 않는다. */
  const resetAttempt = useCallback(() => {
    idempotencyKeyRef.current = null;
    createdRef.current = null;
  }, []);

  const mutation = useMutation<
    SignageSubmissionExpanded,
    ApiError,
    CreateSubmissionValues
  >({
    mutationFn: async (values) => {
      const key = (idempotencyKeyRef.current ??= createIdempotencyKey());

      try {
        if (createdRef.current === null) {
          const fields = {
            title: values.title.trim(),
            categoryId: values.categoryId,
            assetId: values.assetId,
            detailUrl: values.detailUrl.trim(),
            startAt: fromSeoulInput(values.startAt),
            endAt: fromSeoulInput(values.endAt),
            targetGroupIds: values.targetGroupIds ?? [],
          };
          createdRef.current = values.editing
            ? await submissions.update(
                values.editing.submissionId,
                { ...fields, version: values.editing.version },
                { idempotencyKey: key },
              )
            : await submissions.create(
                { ...fields, ziggleNoticeId: values.ziggleNoticeId },
                { idempotencyKey: key },
              );
        }

        return await submissions.submit(createdRef.current.id, {
          idempotencyKey: `${key}:submit`,
        });
      } catch (cause) {
        throw normalizeApiError(cause);
      }
    },
    onSettled: () => {
      inFlightRef.current = false;
    },
    onSuccess: () => {
      resetAttempt();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.submissions.all(),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all() });
    },
  });

  const submit: typeof mutation.mutate = (values, options) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    mutation.mutate(values, options);
  };

  return {
    submit,
    isSubmitting: mutation.isPending,
    error: mutation.error,
    created: mutation.data ?? null,
    resetAttempt,
    reset: mutation.reset,
  };
}
