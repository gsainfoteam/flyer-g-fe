import { useMemo } from "react";
import { useLocation, useParams } from "react-router";
import { readWebUrl } from "@/entities/widget/model/data-content";
import { SURVEY_URL, surveyPrizeOn } from "@/entities/widget/model/operation";
import { seoulDateKey } from "@/entities/widget/model/content";
import { ScaledStage } from "@/entities/poster/ui/ScaledStage";
import { useDodgeHost } from "@/features/flyer-dodge/model/use-dodge-host";
import { DodgeStageFor } from "@/features/flyer-dodge/ui/DodgeStageFor";
import { Logo } from "@/shared/components/Logo";
import {
  captureDeviceTokenFromUrl,
  deviceCredentials,
} from "@/shared/lib/device-credential";
import { gameSocketBase } from "@/shared/lib/game-socket";

/**
 * 전단지 피하기 단독 TV 화면. 이 TV가 판을 계산한다(`useDodgeHost`). 시험과 행사용으로
 * 플레이어 없이 바로 연다. `:roomId`는 기기 id다.
 */
const SURVEY_LINK = readWebUrl(SURVEY_URL);

/** 오른쪽 위 설문 QR. 경품 안내는 응모 마감까지만 붙인다. */
const surveyOf = (now: Date) =>
  SURVEY_LINK
    ? { url: SURVEY_LINK, label: "이벤트 설문", prize: surveyPrizeOn(seoulDateKey(now)) }
    : null;

export function FlyerDodgeTvPage() {
  const { roomId = "lobby" } = useParams();
  const { hash } = useLocation();
  const token = useMemo(() => {
    captureDeviceTokenFromUrl(roomId);
    return deviceCredentials.get(roomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hash가 바뀌면 설정 링크를 다시 읽는다
  }, [roomId, hash]);
  const socketBase = gameSocketBase();
  const host = useDodgeHost(roomId, { socketBase, token });

  return (
    <ScaledStage className="h-dvh w-full">
      <DodgeStageFor
        roomId={roomId}
        state={host.state}
        readState={host.readState}
        now={host.now}
        link={host.status}
        local={socketBase === null}
        ranking={host.ranking}
        rank={host.rank}
        survey={surveyOf(new Date())}
        header={
          <header className="flex h-14 shrink-0 items-center gap-6">
            <Logo size="lg" />
            <span className="text-[30px] font-extrabold tracking-tight text-ink-muted">
              전단지 피하기
            </span>
            <span className="ml-auto text-[26px] text-ink-subtle tabular-nums">
              {host.state.round}번째 판
            </span>
          </header>
        }
      />
    </ScaledStage>
  );
}
