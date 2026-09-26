import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { useRepositories } from "@/shared/api/repositories-context";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import { queryKeys } from "@/shared/api/query-keys";
import { normalizeApiError } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { fromSeoulInput } from "@/shared/lib/datetime";
import { createIdempotencyKey } from "@/shared/lib/idempotency";

/**
 * 게시 신청 생성 → 제출 (명세 FR-SUB-04).
 *
 * 두 단계를 하나의 시도로 묶는다. 생성은 성공했는데 제출이 실패하면, 사용자가
 * 입력을 고친 뒤 다시 눌러도 새로 만들지 않는다. 이미 만든 신청을 최신 입력으로
 * 수정한 뒤 제출한다. 그러지 않으면 실패할 때마다 사용자가 모르는 DRAFT가 쌓인다.
 *
 * 기존 신청을 넘기면(수정·재신청, 명세 FR-DASH-02) 생성 대신 수정 → 제출한다.
 * 수정할 때는 서버가 마지막으로 돌려준 version을 쓴다. 화면을 연 시점의 version을
 * 계속 쓰면 앞선 시도의 수정 때문에 자기 자신과 충돌(409)한다.
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
  /**
   * 서버에 저장까지 끝난 신청과, 그 뒤로 입력이 바뀌었는지.
   * 제출만 실패했을 때 새로 만들지 않고 이것을 고쳐 제출한다.
   */
  const savedRef = useRef<{
    submission: SignageSubmissionExpanded;
    stale: boolean;
  } | null>(null);
  /**
   * 진행 중 여부를 ref로 따로 둔다.
   *
   * `isPending`은 다시 렌더링된 뒤에야 true가 된다. 더블 클릭은 그 사이에 들어오므로
   * 상태만으로는 두 번째 클릭을 막지 못한다. (명세 FR-SUB-04)
   */
  const inFlightRef = useRef(false);

  /**
   * 입력이 바뀌었다. 같은 key를 다른 내용으로 재사용하지 않고, 이미 저장한
   * 신청은 다음 제출 때 최신 입력으로 고친다.
   */
  const markInputChanged = useCallback(() => {
    idempotencyKeyRef.current = null;
    if (savedRef.current) savedRef.current.stale = true;
  }, []);

  /** 다른 공지로 바꾸는 것처럼 아예 다른 신청을 시작한다. */
  const startOver = useCallback(() => {
    idempotencyKeyRef.current = null;
    savedRef.current = null;
  }, []);

  const mutation = useMutation<
    SignageSubmissionExpanded,
    ApiError,
    CreateSubmissionValues
  >({
    mutationFn: async (values) => {
      const key = (idempotencyKeyRef.current ??= createIdempotencyKey());

      const fields = {
        title: values.title.trim(),
        categoryId: values.categoryId,
        assetId: values.assetId,
        detailUrl: values.detailUrl.trim(),
        startAt: fromSeoulInput(values.startAt),
        endAt: fromSeoulInput(values.endAt),
        targetGroupIds: values.targetGroupIds ?? [],
      };

      try {
        const saved = savedRef.current;
        if (saved === null) {
          const submission = values.editing
            ? await submissions.update(
                values.editing.submissionId,
                { ...fields, version: values.editing.version },
                { idempotencyKey: key },
              )
            : await submissions.create(
                { ...fields, ziggleNoticeId: values.ziggleNoticeId },
                { idempotencyKey: key },
              );
          savedRef.current = { submission, stale: false };
        } else if (saved.stale) {
          const submission = await submissions.update(
            saved.submission.id,
            { ...fields, version: saved.submission.version },
            { idempotencyKey: key },
          );
          savedRef.current = { submission, stale: false };
        }

        return await submissions.submit(savedRef.current!.submission.id, {
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
      startOver();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.submissions.all(),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all() });
      // 신청한 공지는 "신청할 수 있는 공지" 목록에서 빠진다.
      void queryClient.invalidateQueries({ queryKey: queryKeys.notices.all() });
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
    markInputChanged,
    startOver,
  };
}
