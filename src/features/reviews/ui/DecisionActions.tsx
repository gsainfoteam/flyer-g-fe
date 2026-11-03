import { useImperativeHandle, useState } from "react";
import type { KeyboardEvent, Ref } from "react";
import { toast } from "sonner";
import {
  getRejectionReasonLabel,
  rejectionReasonsFor,
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
import { ConfirmActionDialog, FormField, Kbd } from "@/shared/components";
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
 *
 * 심사 한 화면은 `onApprove`·`onReject`를 넘겨 결정을 직접 보내지 않고 늦게 보낸다
 * (되돌리기). 그때 승인은 확인 없이 바로 넘어가고, 단축키(`ref`)로도 연다. 반려
 * 사유는 숫자 키로 고른다.
 */
export const REJECT_COMMENT_MAX_LENGTH = 500;
/** "기타"는 분류가 아무 정보도 주지 않으니 사유가 그만큼 구체적이어야 한다. */
export const REJECT_OTHER_MIN_LENGTH = 10;

export type ReviewDecisionKind = "approve" | "reject" | "suspend";

export interface DecisionActionsHandle {
  approve: () => void;
  openReject: () => void;
}

interface DecisionActionsProps {
  submission: SignageSubmissionExpanded;
  /** 서버 시각 기준 실제 상태 */
  status: SubmissionStatus;
  /** 결정이 서버에 반영된 뒤. 다음 건으로 넘어가는 데 쓴다. */
  onDecided?: (kind: ReviewDecisionKind) => void;
  /** 있으면 승인을 확인 없이 이것으로 넘긴다. 호출부가 늦게 보낸다. */
  onApprove?: () => void;
  /** 있으면 반려를 직접 보내지 않고 이것으로 넘긴다. */
  onReject?: (values: {
    reasonCode: RejectionReasonCode;
    comment: string;
  }) => void;
  /** 버튼 옆에 단축키를 보인다. */
  shortcuts?: boolean;
  /** 처음부터 반려 대화상자를 연다. 제보 목록의 "반려"가 이 건을 열며 쓴다. */
  initialReject?: boolean;
  ref?: Ref<DecisionActionsHandle>;
}

type OpenDialog = ReviewDecisionKind | null;

export function DecisionActions({
  submission,
  status,
  onDecided,
  onApprove,
  onReject,
  shortcuts = false,
  initialReject = false,
  ref,
}: DecisionActionsProps) {
  const [open, setOpen] = useState<OpenDialog>(() =>
    initialReject && canReviewerDecide(status) ? "reject" : null,
  );
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
    if (kind === "approve" && onApprove) {
      onApprove();
      return;
    }
    // 새 결정이다. 앞선 시도의 idempotency key를 쓰지 않는다.
    ({ approve, reject, suspend })[kind].startAttempt();
    setOpen(kind);
  };

  useImperativeHandle(ref, () => ({
    approve: () => {
      if (canDecide) openDialog("approve");
    },
    openReject: () => {
      if (canDecide) openDialog("reject");
    },
  }));

  const reasons = rejectionReasonsFor(submission.type);
  // 사유 칸에 쓰는 중이 아니면 숫자 키로 반려 분류를 고른다.
  const pickReasonByNumber = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLTextAreaElement) return;
    const index = Number(event.key) - 1;
    const code = Number.isInteger(index) ? reasons[index] : undefined;
    if (code) {
      event.preventDefault();
      setReasonCode(code);
    }
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
          <Button
            size="sm"
            aria-keyshortcuts={shortcuts ? "A" : undefined}
            onClick={() => openDialog("approve")}
          >
            승인
            {shortcuts && (
              <Kbd aria-hidden className="h-5 min-w-5 text-ink">
                A
              </Kbd>
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-keyshortcuts={shortcuts ? "R" : undefined}
            onClick={() => openDialog("reject")}
          >
            반려
            {shortcuts && (
              <Kbd aria-hidden className="h-5 min-w-5">
                R
              </Kbd>
            )}
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
            {submission.startAt && submission.endAt ? (
              <>
                게시 기간 {formatSeoulDateTime(submission.startAt)} ~{" "}
                {formatSeoulDateTime(submission.endAt)}
              </>
            ) : (
              "승인 즉시 게시 시작"
            )}
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
          if (onReject) {
            onReject({
              reasonCode: reasonCode as RejectionReasonCode,
              comment,
            });
            setReasonCode("");
            setComment("");
            return;
          }
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
        <div className="space-y-4" onKeyDown={pickReasonByNumber}>
          <FormField
            label="반려 분류"
            required
            description={
              shortcuts
                ? `숫자 키 ${reasons
                    .map(
                      (code, index) =>
                        `${index + 1} ${getRejectionReasonLabel(code)}`,
                    )
                    .join(" · ")}`
                : undefined
            }
          >
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
                  {reasons.map((code) => (
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
