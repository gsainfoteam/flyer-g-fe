import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Spinner } from "@/shared/ui/spinner";

/**
 * 승인·반려·중단처럼 되돌리기 어려운 작업의 확인 절차를 통일한다.
 *
 * - `tone="destructive"`는 중단·반려처럼 게시자에게 영향이 큰 작업에 쓴다.
 * - 확인 버튼은 처리 중 중복 클릭을 막는다. (명세 FR-REV-03)
 * - 서버 응답 전에 성공을 가정하지 않는다. 실패하면 dialog를 열어 둔 채 오류를 남긴다.
 * - focus trap, Escape 닫기, focus 복원은 shadcn Dialog의 동작을 그대로 쓴다.
 */
export type ConfirmTone = "default" | "destructive";

interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** 사유 입력 같은 추가 입력을 넣는다. */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  /** 사유 미입력 등으로 아직 실행할 수 없을 때 true */
  confirmDisabled?: boolean;
  /** 성공하면 dialog를 닫는다. 실패하면 열어 둔다. */
  onConfirm: () => Promise<void> | void;
  /**
   * onConfirm이 실패했을 때 호출된다. dialog는 열린 채로 남는다.
   * 오류 문구 표시는 호출부 책임이다. 여기서 오류를 삼키지 않도록 반드시 연결한다.
   */
  onError?: (error: unknown) => void;
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "취소",
  tone = "default",
  confirmDisabled = false,
  onConfirm,
  onError,
}: ConfirmActionDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // 서버가 거절했는데 성공한 것처럼 닫지 않는다. (명세 FR-REV-03, FR-REV-05)
      onError?.(error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isPending || confirmDisabled}
          >
            {isPending && <Spinner aria-hidden="true" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
