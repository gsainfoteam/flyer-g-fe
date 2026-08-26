import { useNavigate } from "react-router";
import { to } from "@/app/router/routes";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import { StatusBadge } from "@/shared/components";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

/**
 * 제출 결과 (명세 FR-SUB-04).
 *
 * 신청 ID와 현재 상태를 보여준 뒤 상세로 보낸다. toast로만 알리면 사용자가
 * 놓쳤을 때 확인할 방법이 없다.
 */
interface SubmitSuccessDialogProps {
  submission: SignageSubmissionExpanded | null;
  /** 닫으면 새 신청을 위해 폼을 비운다. 같은 내용이 두 번 접수되지 않게 한다. */
  onClose: () => void;
}

export function SubmitSuccessDialog({
  submission,
  onClose,
}: SubmitSuccessDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog
      open={submission !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>신청이 접수되었어요</DialogTitle>
          <DialogDescription>
            하우스 관리자가 검토한 뒤 게시가 시작됩니다.
          </DialogDescription>
        </DialogHeader>

        {submission && (
          <dl className="space-y-2.5 rounded-card border border-line bg-surface-muted p-3">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-caption text-ink-muted">신청 ID</dt>
              <dd className="truncate font-mono text-caption text-ink">
                {submission.id}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-caption text-ink-muted">상태</dt>
              <dd>
                <StatusBadge status={submission.status} />
              </dd>
            </div>
          </dl>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            새 신청 작성
          </Button>
          <Button
            autoFocus
            onClick={() => {
              if (!submission) return;
              onClose();
              void navigate(to.submissionDetail(submission.id));
            }}
          >
            신청 상세 보기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
