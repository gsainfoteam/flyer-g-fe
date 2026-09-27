import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { useRepositories } from "@/shared/api/repositories-context";
import { canSubmitterResubmit } from "@/entities/submission";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import { queryKeys } from "@/shared/api/query-keys";
import { normalizeApiError } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { fromSeoulInput } from "@/shared/lib/datetime";
import { createIdempotencyKey } from "@/shared/lib/idempotency";
import type { OriginalSchedule, SubmissionDraft } from "./draft";
import { isScheduleChanged, optionalText } from "./draft";

/**
 * 게시 신청 제출 (명세 FR-SUB-04, `API-CHANGES-BACKEND.md` 5.2·5.3·5.6).
 *
 * - 새 신청: 생성 한 번으로 끝난다. 서버가 바로 검토 대기로 둔다.
 * - 수정: 고친 내용을 저장한다. 반려된 신청이면 이어서 재검토를 요청한다.
 *   검토 대기 중이면 그대로 대기이고, 게시 시작 전 승인 건이면 서버가 검토
 *   대기로 되돌린다(재승인). 프론트는 응답 상태를 그대로 따른다.
 *
 * 수정은 성공했는데 재검토 요청이 실패하면, 사용자가 다시 눌렀을 때 저장부터
 * 다시 하지 않는다. 서버가 마지막으로 돌려준 version으로 재검토만 요청한다.
 * 화면을 연 시점의 version을 계속 쓰면 앞선 저장 때문에 자기 자신과 충돌(409)한다.
 */
export interface CreateSubmissionValues extends SubmissionDraft {
  assetId: string;
  /**
   * 대상 위치. 새 신청에서 비우면 모든 기기다. 수정에서 비우면 보내지 않아 서버가
   * 기존 대상을 그대로 둔다. 빈 배열은 "모든 기기로 바꾸라"는 뜻이 되기 때문이다.
   */
  targetGroupIds?: string[];
  /**
   * 수정 대상. 있으면 create 대신 update한다. 기간을 바꾸지 않았으면 기간은 보내지
   * 않는다. 서버는 기간이 바뀐 수정만 기간 규칙을 다시 본다.
   */
  editing?: {
    submissionId: string;
    version: number;
    schedule: OriginalSchedule;
  };
}

export function useCreateSubmission() {
  const { submissions } = useRepositories();
  const queryClient = useQueryClient();

  /**
   * 시도 하나당 key 하나. 재시도에는 같은 key를 쓴다. 생성과 재검토 요청은 서로 다른
   * 요청이라 key를 따로 둔다. 서버는 key 형식(UUID)을 검사하므로 접미사를 붙이지 않는다.
   */
  const createKeyRef = useRef<string | null>(null);
  const resubmitKeyRef = useRef<string | null>(null);
  /**
   * 저장까지 끝난 신청과, 그 뒤로 입력이 바뀌었는지.
   * 재검토 요청만 실패했을 때 다시 저장하지 않고 이것으로 요청한다.
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
   * 입력이 바뀌었다. 같은 key를 다른 내용으로 재사용하지 않고(서버는 422
   * `IDEMPOTENCY_KEY_REUSED`), 이미 저장한 신청은 다음 제출 때 최신 입력으로 고친다.
   */
  const markInputChanged = useCallback(() => {
    createKeyRef.current = null;
    resubmitKeyRef.current = null;
    if (savedRef.current) savedRef.current.stale = true;
  }, []);

  /** 새 신청을 처음부터 시작한다. */
  const startOver = useCallback(() => {
    createKeyRef.current = null;
    resubmitKeyRef.current = null;
    savedRef.current = null;
  }, []);

  const mutation = useMutation<
    SignageSubmissionExpanded,
    ApiError,
    CreateSubmissionValues
  >({
    mutationFn: async (values) => {
      const fields = {
        title: values.title.trim(),
        categoryId: values.categoryId,
        assetId: values.assetId,
        detailUrl: optionalText(values.detailUrl),
        organizerName: optionalText(values.organizerName),
        subtitle: optionalText(values.subtitle),
        location: optionalText(values.location),
        description: optionalText(values.description),
        startAt: fromSeoulInput(values.startAt),
        endAt: fromSeoulInput(values.endAt),
      };

      try {
        if (!values.editing) {
          const key = (createKeyRef.current ??= createIdempotencyKey());
          return await submissions.create(
            { ...fields, targetGroupIds: values.targetGroupIds ?? [] },
            { idempotencyKey: key },
          );
        }

        const saved = savedRef.current;
        if (saved === null || saved.stale) {
          const { startAt, endAt, ...unscheduled } = fields;
          const updated = await submissions.update(
            values.editing.submissionId,
            {
              ...unscheduled,
              ...(isScheduleChanged(values, values.editing.schedule) && {
                startAt,
                endAt,
              }),
              ...(values.targetGroupIds && {
                targetGroupIds: values.targetGroupIds,
              }),
              version: saved?.submission.version ?? values.editing.version,
            },
          );
          savedRef.current = { submission: updated, stale: false };
        }

        const current = savedRef.current!.submission;
        if (!canSubmitterResubmit(current.status)) return current;
        const key = (resubmitKeyRef.current ??= createIdempotencyKey());
        return await submissions.submit(
          current.id,
          { version: current.version },
          { idempotencyKey: key },
        );
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
