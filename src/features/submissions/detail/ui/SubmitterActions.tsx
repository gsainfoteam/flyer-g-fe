import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { to } from "@/shared/config/routes";
import type { SubmissionView } from "@/entities/submission/model/types";
import { ConfirmActionDialog } from "@/shared/components";
import { toUserMessage } from "@/shared/api/error";
import { isApiError } from "@/shared/api/error";
import { Button } from "@/shared/ui/button";
import {
  canSubmitterCancel,
  canSubmitterEdit,
  canSubmitterResubmit,
} from "@/entities/submission";
import type { SubmissionStatus } from "@/entities/submission";
import { useCancelSubmission } from "../model/use-cancel-submission";

/**
 * 게시자가 상세에서 할 수 있는 일 (명세 FR-DASH-02, `API-CHANGES-BACKEND.md` 5.6·5.7).
 *
 * - 반려됨 → 수정해서 다시 신청
 * - 승인 대기 → 수정 (대기 순서 그대로)
 * - 예약됨(게시 시작 전) → 수정 (다시 승인을 받는다)
 * - 게시가 시작되기 전까지 → 취소
 * - 게시 중 → 직접 내릴 수 없다. 중단은 관리자에게 요청한다. (명세 FR-REV-05)
 * - 게시 중단 → 아직 다시 신청할 수 없다. 서버에 요청해 둔 상태다
 *   (`API-FOLLOWUP-2026-09.md` 1-1).
 *
 * 무엇을 보여줄지는 `canSubmitterEdit`, `canSubmitterCancel`이 정한다. 버튼 노출은
 * 화면 편의일 뿐이고 최종 판단은 서버가 한다.
 */
interface SubmitterActionsProps {
  submission: SubmissionView;
}

export function SubmitterActions({ submission }: SubmitterActionsProps) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const cancel = useCancelSubmission(submission.id);

  const canCancel = canSubmitterCancel(submission.status);
  const editLabel = editLabelOf(submission.status);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {editLabel && (
        <Button size="sm" asChild>
          <Link to={to.studioEdit(submission.id)}>{editLabel}</Link>
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

      {submission.status === "SCHEDULED" && (
        <p className="text-caption text-ink-muted">
          고치면 다시 승인을 받아야 게시돼요.
        </p>
      )}

      {submission.status === "PUBLISHED" && (
        <p className="text-caption text-ink-muted">
          게시 중에는 직접 내릴 수 없어요. 급하면 하우스 관리자에게 게시 중단을
          요청해 주세요.
        </p>
      )}

      {submission.status === "SUSPENDED" && (
        <p className="text-caption text-ink-muted">
          관리자가 게시를 중단했어요. 사유는 처리 이력에서 확인할 수 있어요.
          다시 게시하려면 하우스 관리자에게 문의해 주세요.
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

/** 고칠 수 있는 상태별 버튼 이름. 고칠 수 없으면 null */
function editLabelOf(status: SubmissionStatus): string | null {
  if (!canSubmitterEdit(status)) return null;
  if (status === "DRAFT") return "이어서 작성";
  return canSubmitterResubmit(status) ? "수정해서 다시 신청" : "수정하기";
}
