import { initialBattle } from "@/entities/game/model/click-battle";
import { StageHeader } from "@/entities/poster/ui/StageHeader";
import { ClickBattleBoard } from "./ClickBattleBoard";

/**
 * 클릭 배틀 위젯의 미리보기. 게임 방을 열 수 없는 화면(기기 토큰이 없는 관리자
 * 미리보기)에서 위젯이 어떻게 보이는지만 보여 준다. 방을 열지 않고, QR 자리는 비워 두고,
 * 순환을 붙잡지 않는다.
 */
const EMPTY_BATTLE = initialBattle();

export function BattlePreview({
  deviceLabel,
  serverTime,
}: {
  deviceLabel: string | null;
  serverTime: Date | null;
}) {
  return (
    <ClickBattleBoard
      roomId="preview"
      state={EMPTY_BATTLE}
      now={0}
      link={null}
      local={false}
      previewOnly
      idleHint="미리보기 · 실제 TV에서는 QR로 참가하면 게임이 시작돼요"
      header={
        <StageHeader
          deviceLabel={deviceLabel}
          serverTime={serverTime}
          clockTicking
        >
          <span className="text-[26px] font-extrabold text-ink-muted">
            클릭 배틀
          </span>
        </StageHeader>
      }
    />
  );
}
