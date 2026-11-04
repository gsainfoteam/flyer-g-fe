import type { ComponentProps } from "react";
import type { GameLinkStatus } from "@/shared/lib/ws-game-channel";
import { dodgeJoinUrlOf } from "../model/join-url";
import { DodgeStage } from "./DodgeStage";

type StageProps = ComponentProps<typeof DodgeStage>;

/**
 * 연결 상태에 따라 QR을 보여 줄지 정해 `DodgeStage`에 넘긴다.
 * 서버 중계는 방이 열려야(TV 인증) QR을 보여 준다. 그전에 찍으면 붙을 곳이 없다.
 */
export function DodgeStageFor({
  roomId,
  link,
  local,
  ...rest
}: Omit<StageProps, "joinUrl" | "closedLabel"> & {
  roomId: string;
  link: GameLinkStatus | null;
  local: boolean;
}) {
  const ready = local || link === "open";
  const joinable = rest.state.phase === "LOBBY";
  return (
    <DodgeStage
      {...rest}
      joinUrl={ready && joinable ? dodgeJoinUrlOf(roomId, rest.state.ticket) : null}
      closedLabel={
        link === "unauthorized"
          ? "이 TV는 게임을 열 수 없어요\n기기 설정 링크로 다시 열어 주세요"
          : link === "replaced"
            ? "다른 화면에서\n이 TV의 게임을 열었어요"
            : "연결 준비 중이에요"
      }
    />
  );
}
