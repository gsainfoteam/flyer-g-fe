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
 * 무엇이 어떤 상태로 접수됐는지 보여준 뒤 다음 할 일을 고르게 한다. toast로만
 * 알리면 사용자가 놓쳤을 때 확인할 방법이 없다.
 *
 * 접수된 신청은 이 화면에서 더 고칠 수 없다. 닫으면 폼에 남지 않고 다음 화면으로
 * 간다 — 새 신청이면 빈 폼, 수정이었으면 그 신청의 상세다. 같은 내용을 한 번 더
 * 보내거나, 이미 검토 중인 신청의 수정 화면에 갇히지 않게 한다.
 */
interface SubmitSuccessDialogProps {
  submission: SignageSubmissionExpanded | null;
  /** 반려·작성 중인 신청을 고쳐 다시 낸 경우 */
  isResubmission: boolean;
  onStartNew: () => void;
  onOpenDetail: () => void;
}

export function SubmitSuccessDialog({
  submission,
  isResubmission,
  onStartNew,
  onOpenDetail,
}: SubmitSuccessDialogProps) {
  return (
    <Dialog
      open={submission !== null}
      onOpenChange={(open) => {
        if (open) return;
        if (isResubmission) onOpenDetail();
        else onStartNew();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isResubmission ? "다시 신청했어요" : "신청이 접수되었어요"}
          </DialogTitle>
          <DialogDescription>
            하우스 관리자가 검토한 뒤 게시가 시작됩니다.
          </DialogDescription>
        </DialogHeader>

        {submission && (
          <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface-muted p-3">
            <p className="min-w-0 truncate text-label text-ink">
              {submission.title}
            </p>
            <StatusBadge status={submission.status} />
          </div>
        )}

        <DialogFooter>
          {!isResubmission && (
            <Button variant="outline" onClick={onStartNew}>
              새 신청 작성
            </Button>
          )}
          <Button autoFocus onClick={onOpenDetail}>
            신청 상세 보기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
