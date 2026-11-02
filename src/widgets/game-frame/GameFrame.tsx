import type { GameWidgetType } from "@/entities/widget/model/types";
import { BattlePreview } from "@/features/click-battle/ui/BattlePreview";
import { BattleWidget } from "@/features/click-battle/ui/BattleWidget";
import { ShuffleboardPreview } from "@/features/shuffleboard/ui/ShuffleboardPreview";
import { ShuffleboardWidget } from "@/features/shuffleboard/ui/ShuffleboardWidget";

/**
 * 게임 위젯 화면. 게임 종류마다 위젯을 고른다. 새 게임은 여기에 한 줄을 더한다.
 *
 * 모든 게임 위젯은 같은 값을 받고 같은 신호를 낸다. 화면에 뜨는 동안 이 TV의 게임 방을
 * 열고, 누가 참가하면 `onActiveChange(true)`, 판이 비면 `onSessionEnd`.
 * `previewOnly`면 방을 열지 않고 모양만 보여 준다(기기 토큰이 없는 관리자 미리보기).
 */
export interface GameFrameProps {
  type: GameWidgetType;
  roomId: string;
  socketBase: string | null;
  token: string | null;
  deviceLabel: string | null;
  serverTime: Date | null;
  previewOnly: boolean;
  onActiveChange: (active: boolean) => void;
  onSessionEnd: () => void;
  /** 시간대에 고정된 때. 세션 상한·상대 기다림으로 판을 비우지 않는다. */
  pinned: boolean;
  /** 행사 시간대 화면에만 붙이는 설문 QR */
  survey: { url: string; label: string } | null;
}

export function GameFrame({ type, previewOnly, ...props }: GameFrameProps) {
  switch (type) {
    case "CLICK_BATTLE":
      return previewOnly ? (
        <BattlePreview deviceLabel={props.deviceLabel} serverTime={props.serverTime} />
      ) : (
        <BattleWidget {...props} />
      );
    case "SHUFFLEBOARD":
      return previewOnly ? (
        <ShuffleboardPreview deviceLabel={props.deviceLabel} serverTime={props.serverTime} />
      ) : (
        <ShuffleboardWidget {...props} />
      );
  }
}
