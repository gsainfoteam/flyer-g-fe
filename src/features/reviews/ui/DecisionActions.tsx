import { useState } from "react";
import { toast } from "sonner";
import {
  REJECTION_REASON_CODES,
  getRejectionReasonLabel,
} from "@/entities/review";
import type { RejectionReasonCode } from "@/entities/review";
import {
  canReviewerDecide,
  canReviewerSuspend,
  getStatusLabel,
} from "@/entities/submission";
import type {
  SignageSubmissionExpanded,
  SubmissionStatus,
} from "@/entities/submission";
import { useTargetGroupLabel } from "@/entities/device/api/queries";
import { ConfirmActionDialog, FormField } from "@/shared/components";
import { isApiError, toUserMessage } from "@/shared/api/error";
import { formatSeoulDateTime } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import {
  useApproveSubmission,
  useRejectSubmission,
  useSuspendSubmission,
} from "../model/use-review-actions";

/**
 * 검토 결정 버튼과 확인 절차 (명세 FR-REV-03 ~ FR-REV-05).
 *
 * - 승인: 기간·대상 위치·검토 버전을 마지막으로 확인시킨 뒤 실행한다.
 * - 반려: 분류와 게시자 공개 사유가 필수다. "기타"는 무엇이 문제인지 알 수 있을
 *   만큼 구체적으로 적어야 한다.
 * - 중단: 예약·게시 중에만 보이는 위험 동작이다.
 *
 * 버튼은 저장된 상태가 아니라 서버 시각 기준 실제 상태로 판단한다. 기간이 끝난
 * "게시 중"은 이미 종료라 중단할 것이 없다.
 *
 * 409 충돌은 "다른 관리자가 이미 처리했다"는 뜻이다. 다이얼로그를 닫고 알린 뒤
 * 화면을 최신 상태로 바꾼다. 같은 버튼을 계속 눌러 봐야 같은 409가 날 뿐이다.
 */
export const REJECT_COMMENT_MAX_LENGTH = 500;
/** "기타"는 분류가 아무 정보도 주지 않으니 사유가 그만큼 구체적이어야 한다. */
export const REJECT_OTHER_MIN_LENGTH = 10;

export type ReviewDecisionKind = "approve" | "reject" | "suspend";

interface DecisionActionsProps {
  submission: SignageSubmissionExpanded;
  /** 서버 시각 기준 실제 상태 */
  status: SubmissionStatus;
  /** 결정이 서버에 반영된 뒤. 다음 건으로 넘어가는 데 쓴다. */
  onDecided?: (kind: ReviewDecisionKind) => void;
}

type OpenDialog = ReviewDecisionKind | null;

export function DecisionActions({
  submission,
  status,
  onDecided,
}: DecisionActionsProps) {
  const [open, setOpen] = useState<OpenDialog>(null);
  const [reasonCode, setReasonCode] = useState<RejectionReasonCode | "">("");
  const [comment, setComment] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  const approve = useApproveSubmission(submission.id);
  const reject = useRejectSubmission(submission.id);
  const suspend = useSuspendSubmission(submission.id);
  const targetLabel = useTargetGroupLabel(submission.targetGroupIds);

  const canDecide = canReviewerDecide(status);
  const canSuspend = canReviewerSuspend(status);

  const trimmedComment = comment.trim();
  const rejectReady =
    reasonCode !== "" &&
    trimmedComment.length > 0 &&
    (reasonCode !== "OTHER" ||
      trimmedComment.length >= REJECT_OTHER_MIN_LENGTH);

  const openDialog = (kind: ReviewDecisionKind) => {
    // 새 결정이다. 앞선 시도의 idempotency key를 쓰지 않는다.
    ({ approve, reject, suspend })[kind].startAttempt();
    setOpen(kind);
  };

  const handleError = (action: string) => (error: unknown) => {
    if (isApiError(error) && error.code === "CONFLICT") {
      setOpen(null);
      toast.error(`${action}하지 못했어요`, {
        description: "다른 관리자가 먼저 처리했어요. 최신 상태로 바꿨어요.",
      });
      return;
    }
    toast.error(`${action}하지 못했어요`, {
      description: isApiError(error)
        ? toUserMessage(error)
        : "잠시 후 다시 시도해 주세요.",
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {canDecide && (
        <>
          <Button size="sm" onClick={() => openDialog("approve")}>
            승인
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openDialog("reject")}
          >
            반려
          </Button>
        </>
      )}

      {canSuspend && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => openDialog("suspend")}
        >
          게시 중단하기
        </Button>
      )}

      {!canDecide && !canSuspend && (
        <p className="text-caption text-ink-muted">
          {getStatusLabel(status)} 상태에서는 처리할 작업이 없어요.
        </p>
      )}

      <ConfirmActionDialog
        open={open === "approve"}
        onOpenChange={(next) => setOpen(next ? "approve" : null)}
        title="이 신청을 승인할까요?"
        description={
          <>
            게시 기간 {formatSeoulDateTime(submission.startAt)} ~{" "}
            {formatSeoulDateTime(submission.endAt)}
            {targetLabel && <> · {targetLabel}</>} · 검토 버전 v
            {submission.version}
          </>
        }
        confirmLabel="승인"
        onConfirm={async () => {
          const updated = await approve.mutateAsync({
            revision: submission.version,
          });
          toast.success("승인했어요", {
            description: `지금 상태: ${getStatusLabel(updated.status)}`,
          });
          onDecided?.("approve");
        }}
        onError={handleError("승인")}
      />

      <ConfirmActionDialog
        open={open === "reject"}
        onOpenChange={(next) => {
          setOpen(next ? "reject" : null);
          if (!next) {
            setReasonCode("");
            setComment("");
          }
        }}
        title="이 신청을 반려할까요?"
        description="사유는 게시자에게 그대로 보여요. 무엇을 고쳐야 하는지 알 수 있게 적어주세요."
        confirmLabel="반려"
        tone="destructive"
        confirmDisabled={!rejectReady}
        onConfirm={async () => {
          await reject.mutateAsync({
            revision: submission.version,
            reasonCode: reasonCode as RejectionReasonCode,
            comment,
          });
          toast.success("반려했어요", {
            description: "게시자가 사유를 확인하고 다시 신청할 수 있어요.",
          });
          onDecided?.("reject");
        }}
        onError={handleError("반려")}
      >
        <div className="space-y-4">
          <FormField label="반려 분류" required>
            {(control) => (
              <Select
                value={reasonCode}
                onValueChange={(value) => {
                  if (value) setReasonCode(value as RejectionReasonCode);
                }}
              >
                <SelectTrigger id={control.id} className="w-full">
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASON_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {getRejectionReasonLabel(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          <FormField
            label="게시자에게 보낼 사유"
            required
            description={
              reasonCode === "OTHER"
                ? `기타는 무엇이 문제인지 ${REJECT_OTHER_MIN_LENGTH}자 이상 적어 주세요. ${trimmedComment.length} / ${REJECT_COMMENT_MAX_LENGTH}자`
                : `${trimmedComment.length} / ${REJECT_COMMENT_MAX_LENGTH}자`
            }
          >
            {(control) => (
              <Textarea
                {...control}
                rows={3}
                maxLength={REJECT_COMMENT_MAX_LENGTH}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="예: 포스터의 마감일과 공지 본문의 마감일이 다릅니다."
              />
            )}
          </FormField>
        </div>
      </ConfirmActionDialog>

      <ConfirmActionDialog
        open={open === "suspend"}
        onOpenChange={(next) => {
          setOpen(next ? "suspend" : null);
          if (!next) setSuspendReason("");
        }}
        title="게시를 즉시 중단할까요?"
        description="모든 TV에서 다음 동기화 때 내려가요. 사유는 게시자에게 표시됩니다."
        confirmLabel="게시 중단"
        tone="destructive"
        confirmDisabled={suspendReason.trim().length === 0}
        onConfirm={async () => {
          await suspend.mutateAsync({ reason: suspendReason });
          toast.success("게시를 중단했어요");
          onDecided?.("suspend");
        }}
        onError={handleError("중단")}
      >
        <FormField label="중단 사유" required>
          {(control) => (
            <Textarea
              {...control}
              rows={3}
              maxLength={REJECT_COMMENT_MAX_LENGTH}
              value={suspendReason}
              onChange={(event) => setSuspendReason(event.target.value)}
              placeholder="예: 행사가 취소되어 게시를 내립니다."
            />
          )}
        </FormField>
      </ConfirmActionDialog>
    </div>
  );
}
