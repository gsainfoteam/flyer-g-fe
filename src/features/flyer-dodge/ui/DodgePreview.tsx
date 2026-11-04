import { initialDodge } from "@/entities/game/model/flyer-dodge";
import { StageHeader } from "@/entities/poster/ui/StageHeader";
import { DodgeStage } from "./DodgeStage";

/**
 * 전단지 피하기 위젯의 미리보기. 게임 방을 열 수 없는 화면(기기 토큰이 없는 관리자
 * 미리보기)에서 위젯이 어떻게 보이는지만 보여 준다. 방을 열지 않고 순환을 붙잡지 않는다.
 */
const EMPTY_RUN = initialDodge();
const readEmpty = () => EMPTY_RUN;

export function DodgePreview({
  deviceLabel,
  serverTime,
}: {
  deviceLabel: string | null;
  serverTime: Date | null;
}) {
  return (
    <DodgeStage
      state={EMPTY_RUN}
      readState={readEmpty}
      now={0}
      joinUrl={null}
      closedLabel={"미리보기\n실제 TV에서 QR이 나와요"}
      ranking={[]}
      rank={null}
      survey={null}
      header={
        <StageHeader deviceLabel={deviceLabel} serverTime={serverTime} clockTicking>
          <span className="text-[26px] font-extrabold text-ink-muted">전단지 피하기</span>
        </StageHeader>
      }
    />
  );
}
