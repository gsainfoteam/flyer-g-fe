import { initialMatch } from "@/entities/game/model/shuffleboard";
import { StageHeader } from "@/entities/poster/ui/StageHeader";
import { ShuffleboardStage } from "./ShuffleboardStage";

/**
 * 셔플보드 위젯의 미리보기. 게임 방을 열 수 없는 화면(기기 토큰이 없는 관리자
 * 미리보기)에서 위젯이 어떻게 보이는지만 보여 준다. 방을 열지 않고, QR 자리에는 안내를
 * 적고, 순환을 붙잡지 않는다. 클릭 배틀의 `BattlePreview`와 같다.
 */
const EMPTY_MATCH = initialMatch(1, "preview");
const NO_QR = { A: null, B: null };

export function ShuffleboardPreview({
  deviceLabel,
  serverTime,
}: {
  deviceLabel: string | null;
  serverTime: Date | null;
}) {
  return (
    <ShuffleboardStage
      state={EMPTY_MATCH}
      now={0}
      joinUrls={NO_QR}
      closedLabel={"미리보기\n실제 TV에서 QR이 나와요"}
      survey={null}
      header={
        <StageHeader deviceLabel={deviceLabel} serverTime={serverTime} clockTicking>
          <span className="text-[26px] font-extrabold text-ink-muted">컬링</span>
        </StageHeader>
      }
    />
  );
}
