import { useMemo } from "react";
import { useLocation, useParams } from "react-router";
import { ScaledStage } from "@/entities/poster/ui/ScaledStage";
import { gameSocketBase } from "@/features/click-battle/api/game-socket";
import { useBattleHost } from "@/features/click-battle/model/use-battle-host";
import { ClickBattleBoard, LinkBadge } from "@/features/click-battle/ui/ClickBattleBoard";
import {
  captureDeviceTokenFromUrl,
  deviceCredentials,
} from "@/shared/lib/device-credential";
import { Logo } from "@/shared/components/Logo";

/**
 * 클릭 배틀 단독 TV 화면. 이 TV가 경기의 심판이다(`useBattleHost`).
 *
 * 플레이어 순환 중에 뜨는 게임 위젯과 같은 본문(`ClickBattleBoard`)을 쓴다. 이 화면은
 * 게임만 계속 열어 둘 때 쓴다.
 */
export function ClickBattleTvPage() {
  const { roomId = "lobby" } = useParams();
  // 방 id는 기기 id다. 기기 설정 링크(`#token=`)로 열면 토큰을 저장하고 주소에서 지운다.
  // 플레이어 화면에서 이미 연결한 TV라면 저장된 토큰을 그대로 쓴다.
  // 같은 탭에 새 설정 링크를 붙여 넣으면 `#` 뒤만 바뀌어 페이지가 다시 뜨지 않는다.
  // 주소의 hash가 바뀔 때마다 다시 읽어야 재발급한 토큰이 바로 쓰인다.
  const { hash } = useLocation();
  const token = useMemo(() => {
    captureDeviceTokenFromUrl(roomId);
    return deviceCredentials.get(roomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hash가 바뀌면 설정 링크를 다시 읽는다
  }, [roomId, hash]);
  const socketBase = gameSocketBase();
  const { state, now, status: link } = useBattleHost(roomId, { socketBase, token });

  return (
    <ScaledStage className="h-full w-full">
      <ClickBattleBoard
        roomId={roomId}
        state={state}
        now={now}
        link={link}
        local={socketBase === null}
        header={
          <header className="flex h-14 shrink-0 items-center gap-6">
            <Logo size="lg" />
            <span className="text-[30px] font-extrabold tracking-tight text-ink-muted">
              클릭 배틀
            </span>
            <span className="ml-auto text-[26px] text-ink-subtle tabular-nums">
              {state.round}번째 판
            </span>
            <LinkBadge local={socketBase === null} status={link} />
          </header>
        }
      />
    </ScaledStage>
  );
}
