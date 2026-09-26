import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { to } from "@/app/router/routes";
import type { SubmissionView } from "@/entities/submission/model/types";
import { ConfirmActionDialog } from "@/shared/components";
import { toUserMessage } from "@/shared/api/error";
import { isApiError } from "@/shared/api/error";
import { Button } from "@/shared/ui/button";
import {
  canSubmitterCancel,
  canSubmitterEdit,
} from "@/entities/submission";
import { useCancelSubmission } from "../model/use-cancel-submission";

/**
 * 게시자가 상세에서 할 수 있는 일 (명세 FR-DASH-02).
 *
 * - 작성 중 → 이어서 작성
 * - 반려됨·게시 중단 → 수정해서 다시 신청 (명세 6.3 전이)
 * - 승인 대기·반려됨·예약됨 → 시작 전 취소
 * - 게시 중 → 직접 내릴 수 없다. 중단은 관리자에게 요청한다. (명세 FR-REV-05)
 *
 * 무엇을 보여줄지는 상태 전이표(`canSubmitterEdit`, `canSubmitterCancel`)가
 * 정한다. 버튼 노출은 화면 편의일 뿐이고 최종 판단은 서버가 한다.
 */
interface SubmitterActionsProps {
  submission: SubmissionView;
}

export function SubmitterActions({ submission }: SubmitterActionsProps) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const cancel = useCancelSubmission(submission.id);

  const canCancel = canSubmitterCancel(submission.status);
  const canResubmit =
    canSubmitterEdit(submission.status) && submission.status !== "DRAFT";

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {submission.status === "DRAFT" && (
        <Button size="sm" asChild>
          <Link to={to.studioEdit(submission.id)}>이어서 작성</Link>
        </Button>
      )}

      {canResubmit && (
        <Button size="sm" asChild>
          <Link to={to.studioEdit(submission.id)}>수정해서 다시 신청</Link>
        </Button>
      )}

      {canCancel && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            cancel.startAttempt();
            setConfirmingCancel(true);
          }}
        >
          신청 취소하기
        </Button>
      )}

      {submission.status === "PUBLISHED" && (
        <p className="text-caption text-ink-muted">
          게시 중에는 직접 내릴 수 없어요. 급하면 하우스 관리자에게 게시 중단을
          요청해 주세요.
        </p>
      )}

      <ConfirmActionDialog
        open={confirmingCancel}
        onOpenChange={setConfirmingCancel}
        title="이 신청을 취소할까요?"
        description="취소하면 검토와 게시가 진행되지 않아요. 되돌릴 수 없습니다."
        confirmLabel="신청 취소"
        cancelLabel="계속 두기"
        tone="destructive"
        onConfirm={async () => {
          await cancel.mutateAsync({ version: submission.version });
          toast.success("신청을 취소했어요");
        }}
        onError={(error) => {
          toast.error("취소하지 못했어요", {
            description: isApiError(error)
              ? toUserMessage(error)
              : "잠시 후 다시 시도해 주세요.",
          });
        }}
      />
    </div>
  );
}
