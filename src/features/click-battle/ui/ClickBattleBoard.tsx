import type { ReactNode } from "react";
import { BATTLE_RULES, TEAMS, secondsLeft } from "@/entities/game/model/click-battle";
import type { BattleState, Team } from "@/entities/game/model/click-battle";
import type { GameLinkStatus } from "@/shared/lib/ws-game-channel";
import { QRCodeBox } from "@/shared/components/QRCodeBox";
import { to } from "@/shared/config/routes";
import { cn } from "@/shared/lib/utils";

/**
 * 클릭 배틀 TV 화면의 본문. 단독 게임 화면과 플레이어의 게임 위젯이 함께 쓴다.
 *
 * 양 팀을 나란히 두고 점수를 가장 크게 그린다. 로비를 지나며 몇 초 보는 화면이라
 * 지금 무슨 단계인지와 남은 초가 점수 다음으로 읽힌다. 저사양 TV에서 끊기지 않게
 * 움직임은 두지 않는다. 1920x1080 기준 px이고, 축소는 감싸는 쪽이 한다.
 */
const TEAM_STYLE: Record<Team, { text: string; ring: string; dot: string }> = {
  A: { text: "text-accent", ring: "ring-accent", dot: "bg-accent" },
  B: { text: "text-info", ring: "ring-info", dot: "bg-info" },
};

function statusOf(state: BattleState, seconds: number | null): { title: string; detail: string } {
  switch (state.phase) {
    case "LOBBY":
      return {
        title: "참가자 모집 중",
        detail: "양 팀에 한 명씩 모이면 시작해요",
      };
    case "COUNTDOWN":
      return { title: `${seconds}초 뒤 시작`, detail: "아직 들어올 수 있어요" };
    case "PLAYING":
      return { title: `${seconds}초`, detail: "지금 누르세요!" };
    case "RESULT":
      return {
        title:
          state.winner === "DRAW" ? "무승부!" : `${state.winner}팀 승리!`,
        detail: `${seconds}초 뒤 다음 참가자를 모집해요`,
      };
  }
}


interface ClickBattleBoardProps {
  roomId: string;
  state: BattleState;
  now: number;
  /** 서버 중계 연결 상태. 같은 브라우저 탭끼리(개발용)면 null */
  link: GameLinkStatus | null;
  /** 같은 브라우저 탭끼리 잇는 개발용 연결인가 */
  local: boolean;
  /** 맨 위 머리 줄. 화면마다 다르다. */
  header: ReactNode;
  /** 아무도 없을 때 상태 줄에 띄울 안내. 위젯에서 "참가하면 시작" 등 */
  idleHint?: string;
}

export function ClickBattleBoard({
  roomId,
  state,
  now,
  link,
  local,
  header,
  idleHint,
}: ClickBattleBoardProps) {
  // 서버 중계는 방이 열려야(TV 인증) QR을 보여 준다. 그전에 찍으면 붙을 곳이 없다.
  const linkReady = local || link === "open";
  const seconds = secondsLeft(state, now);
  const status = statusOf(state, seconds);
  const joinable = state.phase === "LOBBY" || state.phase === "COUNTDOWN";

  return (
      <div className="flex h-full flex-col gap-8">
        {header}

        <div className="flex shrink-0 items-baseline gap-8">
          <p
            className={cn(
              "text-[88px] leading-none font-extrabold tracking-tight tabular-nums",
              state.phase === "RESULT" && state.winner !== "DRAW" && state.winner
                ? TEAM_STYLE[state.winner].text
                : "text-ink",
            )}
          >
            {status.title}
          </p>
          <p className="text-[34px] text-ink-muted">{state.phase === "LOBBY" && state.players.length === 0 && idleHint
              ? idleHint
              : status.detail}</p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-8">
          {TEAMS.map((team) => (
            <TeamPanel
              key={team}
              team={team}
              state={state}
              joinUrl={
                joinable && linkReady
                  ? `${window.location.origin}${to.playClickBattle(roomId, team)}`
                  : null
              }
              closedLabel={
                !joinable
                  ? "경기 중에는\n입장이 마감돼요"
                  : link === "unauthorized"
                    ? "이 TV는 게임을 열 수 없어요\n기기 설정 링크로 다시 열어 주세요"
                    : link === "replaced"
                      ? "다른 화면에서\n이 TV의 게임을 열었어요"
                      : "연결 준비 중이에요"
              }
            />
          ))}
        </div>

        <p className="shrink-0 text-[24px] text-ink-subtle">
          팀당 최대 {BATTLE_RULES.maxPlayersPerTeam}명 · 한 폰에 한 명 ·{" "}
          {BATTLE_RULES.matchMs / 1000}초 동안 더 많이 누른 팀이 이겨요 · 로그인 없이 이름만
          적고 참가해요
        </p>
      </div>
  );
}

const LINK_LABEL: Record<GameLinkStatus, { text: string; dot: string }> = {
  connecting: { text: "서버 연결 중", dot: "bg-warning" },
  reconnecting: { text: "다시 연결 중", dot: "bg-warning" },
  open: { text: "폰 연결 가능", dot: "bg-success" },
  "waiting-host": { text: "서버 연결 중", dot: "bg-warning" },
  unauthorized: { text: "기기 인증 실패", dot: "bg-danger" },
  replaced: { text: "다른 화면에서 열림", dot: "bg-danger" },
};

export function LinkBadge({ local, status }: { local: boolean; status: GameLinkStatus | null }) {
  if (local) {
    return <span className="text-[22px] text-ink-subtle">같은 브라우저 전용</span>;
  }
  const { text, dot } = LINK_LABEL[status ?? "connecting"];
  return (
    <span className="flex items-center gap-2 text-[22px] text-ink-subtle">
      <span aria-hidden="true" className={cn("size-3 rounded-pill", dot)} />
      {text}
    </span>
  );
}

function TeamPanel({
  team,
  state,
  joinUrl,
  closedLabel,
}: {
  team: Team;
  state: BattleState;
  joinUrl: string | null;
  /** QR을 보여 줄 수 없을 때 그 자리에 적는다. */
  closedLabel: string;
}) {
  const style = TEAM_STYLE[team];
  const players = state.players.filter((player) => player.team === team);
  const isWinner = state.phase === "RESULT" && state.winner === team;

  return (
    <section
      aria-label={`${team}팀`}
      className={cn(
        "flex min-h-0 gap-10 rounded-tv-card bg-surface px-14 py-12",
        isWinner && `ring-6 ${style.ring}`,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-6">
          <p className={cn("text-[56px] font-extrabold", style.text)}>{team}팀</p>
          <div className="flex items-center gap-2" aria-label={`${players.length}명 참가`}>
            {Array.from({ length: BATTLE_RULES.maxPlayersPerTeam }, (_, index) => (
              <span
                key={index}
                className={cn(
                  "size-5 rounded-pill",
                  index < players.length ? style.dot : "bg-surface-muted",
                )}
              />
            ))}
            <span className="ml-2 text-[28px] text-ink-subtle tabular-nums">
              {players.length} / {BATTLE_RULES.maxPlayersPerTeam}
            </span>
          </div>
        </div>

        <p
          className={cn(
            "mt-auto text-[220px] leading-none font-extrabold tracking-tight tabular-nums",
            style.text,
          )}
        >
          {state.scores[team].toLocaleString("ko-KR")}
        </p>
        <p className="mt-3 text-[28px] font-bold text-ink-subtle">번 눌렀어요</p>

        <p className="mt-8 truncate text-[28px] text-ink-muted">
          {players.length > 0
            ? players.map((player) => player.name).join(" · ")
            : "아직 아무도 없어요"}
        </p>
      </div>

      <div className="flex w-[280px] shrink-0 flex-col items-center justify-end gap-4">
        {joinUrl ? (
          <>
            <QRCodeBox value={joinUrl} size="tv" />
            <p className={cn("text-[32px] font-extrabold", style.text)}>{team}팀으로 참가</p>
          </>
        ) : (
          <p className="text-center text-[26px] leading-snug whitespace-pre-line text-ink-subtle">
            {closedLabel}
          </p>
        )}
      </div>
    </section>
  );
}
