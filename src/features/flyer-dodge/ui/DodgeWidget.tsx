import { useEffect, useRef } from "react";
import { StageHeader } from "@/entities/poster/ui/StageHeader";
import { useDodgeHost } from "../model/use-dodge-host";
import { DodgeStageFor } from "./DodgeStageFor";

/**
 * 플레이어 순환 중에 뜨는 전단지 피하기 위젯. 다른 게임 위젯(`BattleWidget` 등)과 받는
 * 값과 내보내는 신호가 같다. 화면에 뜨는 동안 이 TV의 게임 방을 열고, 누가 참가하면
 * `onActiveChange(true)`로 순환을 멈추게 하고, 판이 끝나 비면 `onSessionEnd`.
 */
const WIDGET_LIMITS = { sessionLimitMs: 5 * 60_000 } as const;

interface DodgeWidgetProps {
  roomId: string;
  socketBase: string | null;
  token: string | null;
  deviceLabel: string | null;
  serverTime: Date | null;
  onActiveChange: (active: boolean) => void;
  onSessionEnd: () => void;
  /** 시간대에 고정된 때. 세션 상한으로 판을 비우지 않는다. */
  pinned?: boolean;
  /** 행사 시간대 화면에만 붙이는 설문 QR */
  survey?: { url: string; label: string } | null;
}

export function DodgeWidget({
  roomId,
  socketBase,
  token,
  deviceLabel,
  serverTime,
  onActiveChange,
  onSessionEnd,
  pinned = false,
  survey = null,
}: DodgeWidgetProps) {
  const host = useDodgeHost(roomId, {
    socketBase,
    token,
    ...(pinned ? {} : WIDGET_LIMITS),
  });

  // 콜백은 렌더마다 새로 올 수 있다. effect가 되풀이되지 않게 ref로 든다.
  const callbacks = useRef({ onActiveChange, onSessionEnd });
  useEffect(() => {
    callbacks.current = { onActiveChange, onSessionEnd };
  }, [onActiveChange, onSessionEnd]);

  const wasActive = useRef(false);
  useEffect(() => {
    callbacks.current.onActiveChange(host.active);
    if (wasActive.current && !host.active) callbacks.current.onSessionEnd();
    wasActive.current = host.active;
  }, [host.active]);

  // 화면을 떠나면 순환을 붙잡지 않는다.
  useEffect(() => () => callbacks.current.onActiveChange(false), []);

  return (
    <DodgeStageFor
      roomId={roomId}
      state={host.state}
      readState={host.readState}
      now={host.now}
      link={host.status}
      local={socketBase === null}
      ranking={host.ranking}
      rank={host.rank}
      survey={survey}
      header={
        <StageHeader deviceLabel={deviceLabel} serverTime={serverTime} clockTicking>
          <span className="text-[26px] font-extrabold text-ink-muted">전단지 피하기</span>
        </StageHeader>
      }
    />
  );
}
