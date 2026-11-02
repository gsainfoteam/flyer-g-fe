import { useMemo } from "react";
import { useLocation, useParams } from "react-router";
import { ScaledStage } from "@/entities/poster/ui/ScaledStage";
import { useShuffleboardHost } from "@/features/shuffleboard/model/use-shuffleboard-host";
import { joinUrlOf } from "@/features/shuffleboard/model/join-url";
import { LinkBadge, ShuffleboardStageFor } from "@/features/shuffleboard/ui/stage-helpers";
import { Logo } from "@/shared/components/Logo";
import { SURVEY_URL } from "@/entities/widget/model/operation";
import { readWebUrl } from "@/entities/widget/model/data-content";
import { gameSocketBase } from "@/shared/lib/game-socket";
import {
  captureDeviceTokenFromUrl,
  deviceCredentials,
} from "@/shared/lib/device-credential";

/**
 * 셔플보드 단독 TV 화면. 이 TV가 경기의 심판이다(`useShuffleboardHost`).
 * 클릭 배틀의 `ClickBattleTvPage`와 같은 모양이다. `:roomId`는 기기 id다.
 */
const SURVEY = (() => {
  const url = readWebUrl(SURVEY_URL);
  return url ? { url, label: "이벤트 설문" } : null;
})();

export function ShuffleboardTvPage() {
  const { roomId = "lobby" } = useParams();
  const { hash } = useLocation();
  const token = useMemo(() => {
    captureDeviceTokenFromUrl(roomId);
    return deviceCredentials.get(roomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hash가 바뀌면 설정 링크를 다시 읽는다
  }, [roomId, hash]);
  const socketBase = gameSocketBase();
  const { state, now, status: link } = useShuffleboardHost(roomId, {
    socketBase,
    token,
  });

  return (
    <ScaledStage className="h-dvh w-full">
      <ShuffleboardStageFor
        state={state}
        now={now}
        link={link}
        local={socketBase === null}
        joinUrlOf={(seat) => joinUrlOf(roomId, seat)}
        survey={SURVEY}
        header={
          <header className="flex h-14 shrink-0 items-center gap-6">
            <Logo size="lg" />
            <span className="text-[30px] font-extrabold tracking-tight text-ink-muted">
              컬링
            </span>
            <span className="ml-auto text-[26px] text-ink-subtle tabular-nums">
              {state.round}번째 경기
            </span>
            <LinkBadge local={socketBase === null} status={link} />
          </header>
        }
      />
    </ScaledStage>
  );
}
