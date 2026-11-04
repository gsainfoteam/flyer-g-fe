import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { isApiError, toUserMessage } from "@/shared/api/error";
import { useSendDecision } from "./use-review-actions";
import type { QueuedDecision } from "./use-review-actions";

/**
 * 결정을 몇 초 늦게 보내 되돌릴 틈을 준다 (기획 4-2).
 *
 * 승인·반려를 누르면 그 건은 대기열에서 바로 빠지고 다음 건으로 넘어간다. 요청은
 * `UNDO_WINDOW_MS` 뒤에 보낸다. 그 사이 "되돌리기"를 누르면 보내지 않고 대기열에
 * 되돌린다. 확인 대화상자 대신 되돌리기로 실수를 막아, 마우스 없이 빠르게 쳐낸다.
 *
 * 화면을 떠나거나 탭을 닫기 전에는 남은 결정을 바로 보낸다. 누른 결정이 사라지면
 * 안 된다.
 */
export const UNDO_WINDOW_MS = 5_000;

interface Scheduled {
  decision: QueuedDecision;
  timer: ReturnType<typeof setTimeout>;
}

export function useDeferredDecisions() {
  const send = useSendDecision();
  const scheduledRef = useRef(new Map<string, Scheduled>());
  /** 대기열에서 숨길 신청. 보내는 중인 것도 응답이 올 때까지 숨긴다. */
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());

  const setHidden = useCallback((id: string, hidden: boolean) => {
    setHiddenIds((current) => {
      const next = new Set(current);
      if (hidden) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const execute = useCallback(
    (id: string) => {
      const scheduled = scheduledRef.current.get(id);
      if (!scheduled) return;
      clearTimeout(scheduled.timer);
      scheduledRef.current.delete(id);
      const { decision } = scheduled;
      const action = decision.kind === "approve" ? "승인" : "반려";
      send(decision)
        .catch((error: unknown) => {
          toast.error(`${action}하지 못했습니다`, {
            description:
              isApiError(error) && error.code === "CONFLICT"
                ? "다른 관리자가 먼저 처리했거나 내용이 변경되었습니다."
                : isApiError(error)
                  ? toUserMessage(error)
                  : "잠시 후 다시 시도하세요.",
          });
        })
        // 목록을 새로 받은 뒤에 숨김을 푼다. 성공한 건은 목록에서 이미 빠져 있다.
        .finally(() => setHidden(id, false));
    },
    [send, setHidden],
  );

  const undo = useCallback(
    (id: string) => {
      const scheduled = scheduledRef.current.get(id);
      if (!scheduled) return false;
      clearTimeout(scheduled.timer);
      scheduledRef.current.delete(id);
      setHidden(id, false);
      return true;
    },
    [setHidden],
  );

  const schedule = useCallback(
    (decision: QueuedDecision, label: string) => {
      const id = decision.submissionId;
      // 같은 건을 다시 결정하면 앞 결정은 버린다.
      undo(id);
      scheduledRef.current.set(id, {
        decision,
        timer: setTimeout(() => execute(id), UNDO_WINDOW_MS),
      });
      setHidden(id, true);
      toast(label, {
        id: `decision-${id}`,
        duration: UNDO_WINDOW_MS,
        action: {
          label: "되돌리기",
          onClick: () => {
            if (undo(id)) toast("실행 취소 완료", { id: `decision-${id}` });
          },
        },
      });
    },
    [execute, setHidden, undo],
  );

  // 화면을 떠나거나 탭을 닫으면 남은 결정을 바로 보낸다.
  useEffect(() => {
    const scheduled = scheduledRef.current;
    const flush = () => {
      for (const id of [...scheduled.keys()]) execute(id);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [execute]);

  return { schedule, undo, hiddenIds };
}
