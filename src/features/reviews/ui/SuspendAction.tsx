import { useState } from "react";
import { toast } from "sonner";
import { ConfirmActionDialog, FormField } from "@/shared/components";
import { isApiError, toUserMessage } from "@/shared/api/error";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { useSuspendSubmission } from "../model/use-review-actions";

const REASON_MAX_LENGTH = 1000;

/** 작성자와 검토자가 공유하는 중단 사유 입력·재시도 흐름. */
export function SuspendAction({
  submissionId,
  allowed,
  onSuspended,
}: {
  submissionId: string;
  allowed: boolean;
  onSuspended?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const suspend = useSuspendSubmission(submissionId);
  const length = reason.trim().length;

  return (
    <>
      {allowed && (
        <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
          게시 중단하기
        </Button>
      )}
      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        title="게시를 중단하시겠습니까?"
        description="모든 TV에서 다음 동기화 시 게시가 중단됩니다. 사유는 처리 이력에 남습니다."
        confirmLabel="게시 중단"
        tone="destructive"
        confirmDisabled={!allowed || length < 1 || length > REASON_MAX_LENGTH}
        onConfirm={async () => {
          await suspend.mutateAsync({ reason });
          toast.success("게시 중단 완료", {
            description: "TV에는 다음 편성 동기화 시 반영됩니다.",
          });
          onSuspended?.();
        }}
        onError={(error) => {
          if (isApiError(error) && error.code === "VALIDATION_FAILED") {
            setReasonError(error.fields?.reason ?? null);
          }
          if (isApiError(error) && error.code === "CONFLICT") {
            setOpen(false);
            toast.error("중단하지 못했습니다", {
              description: "이미 중단되었거나 게시 기간이 끝났을 수 있습니다. 최신 상태를 다시 불러옵니다.",
            });
            return;
          }
          toast.error("중단하지 못했습니다", {
            description: isApiError(error)
              ? toUserMessage(error)
              : "잠시 후 다시 시도하세요.",
          });
        }}
      >
        <FormField
          label="중단 사유"
          required
          description={`${length} / ${REASON_MAX_LENGTH}자`}
          error={
            reasonError ??
            (length > REASON_MAX_LENGTH
              ? "중단 사유는 1000자 이내로 입력하세요."
              : null)
          }
        >
          {(control) => (
            <Textarea
              {...control}
              rows={3}
              value={reason}
              disabled={suspend.isPending}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError(null);
              }}
              placeholder="예: 행사가 취소되어 게시를 내립니다."
            />
          )}
        </FormField>
      </ConfirmActionDialog>
    </>
  );
}
