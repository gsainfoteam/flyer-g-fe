import { useEffect, useRef } from "react";
import { StageHeader } from "@/entities/poster/ui/StageHeader";
import { useBattleHost } from "../model/use-battle-host";
import { ClickBattleBoard } from "./ClickBattleBoard";

/**
 * 플레이어 순환 중에 뜨는 클릭 배틀 위젯.
 *
 * 화면에 뜨는 동안 이 TV의 게임 방을 연다. QR로 누가 참가하면 `onActiveChange(true)`로
 * 알려 순환을 멈추게 하고, 판이 비면(결과 뒤 아무도 없음, 상대 팀을 60초 못 만남,
 * 세션 5분) `onSessionEnd`로 다음 화면으로 넘기게 한다. 경기 중에는 끊지 않는다.
 */
const BATTLE_WIDGET_LIMITS = {
  lobbyWaitMs: 60_000,
  sessionLimitMs: 5 * 60_000,
} as const;

interface BattleWidgetProps {
  roomId: string;
  socketBase: string | null;
  token: string | null;
  deviceLabel: string | null;
  serverTime: Date | null;
  onActiveChange: (active: boolean) => void;
  onSessionEnd: () => void;
}

export function BattleWidget({
  roomId,
  socketBase,
  token,
  deviceLabel,
  serverTime,
  onActiveChange,
  onSessionEnd,
}: BattleWidgetProps) {
  const { state, now, status, active } = useBattleHost(roomId, {
    socketBase,
    token,
    ...BATTLE_WIDGET_LIMITS,
  });

  // 콜백은 렌더마다 새로 올 수 있다. effect가 되풀이되지 않게 ref로 든다.
  const callbacks = useRef({ onActiveChange, onSessionEnd });
  useEffect(() => {
    callbacks.current = { onActiveChange, onSessionEnd };
  }, [onActiveChange, onSessionEnd]);

  const wasActive = useRef(false);
  useEffect(() => {
    callbacks.current.onActiveChange(active);
    if (wasActive.current && !active) callbacks.current.onSessionEnd();
    wasActive.current = active;
  }, [active]);

  // 화면을 떠나면 순환을 붙잡지 않는다.
  useEffect(() => () => callbacks.current.onActiveChange(false), []);

  return (
    <ClickBattleBoard
      roomId={roomId}
      state={state}
      now={now}
      link={status}
      local={socketBase === null}
      idleHint="QR로 참가하면 게임이 시작돼요"
      header={
        <StageHeader deviceLabel={deviceLabel} serverTime={serverTime} clockTicking>
          <span className="text-[26px] font-extrabold text-ink-muted">클릭 배틀</span>
        </StageHeader>
      }
    />
  );
}
