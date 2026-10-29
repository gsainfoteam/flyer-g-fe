import { useParams, useSearchParams } from "react-router";
import { BATTLE_RULES, TEAMS, secondsLeft } from "@/entities/game/model/click-battle";
import type { BattleState, Team } from "@/entities/game/model/click-battle";
import { ScaledStage } from "@/entities/poster/ui/ScaledStage";
import { useBattleHost } from "@/features/click-battle/model/use-battle-host";
import type { PeerStatus } from "@/shared/lib/peer-game-channel";
import { Logo } from "@/shared/components/Logo";
import { QRCodeBox } from "@/shared/components/QRCodeBox";
import { to } from "@/shared/config/routes";
import { cn } from "@/shared/lib/utils";

/**
 * 클릭 배틀 TV 화면. 이 TV가 경기의 심판이다(`useBattleHost`).
 *
 * 양 팀을 나란히 두고 점수를 가장 크게 그린다. 로비를 지나며 몇 초 보는 화면이라
 * 지금 무슨 단계인지와 남은 초가 점수 다음으로 읽힌다. 저사양 TV에서 끊기지 않게
 * 움직임은 두지 않는다.
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

export function ClickBattleTvPage() {
  const { roomId = "lobby" } = useParams();
  const [searchParams] = useSearchParams();
  // 기본은 WebRTC다. `?transport=local`은 시그널링 서버 없이 같은 브라우저 탭끼리 확인한다.
  const transport = searchParams.get("transport") === "local" ? "local" : "webrtc";
  const { state, now, peerId, status: link } = useBattleHost(roomId, { transport });
  // WebRTC는 TV id를 받아야 QR을 만들 수 있다. 그전에는 QR 자리에 연결 상태를 보여 준다.
  const linkReady = transport === "local" || peerId !== null;
  const seconds = secondsLeft(state, now);
  const status = statusOf(state, seconds);
  const joinable = state.phase === "LOBBY" || state.phase === "COUNTDOWN";

  return (
    <ScaledStage className="h-full w-full">
      <div className="flex h-full flex-col gap-8">
        <header className="flex h-14 shrink-0 items-center gap-6">
          <Logo size="lg" />
          <span className="text-[30px] font-extrabold tracking-tight text-ink-muted">
            클릭 배틀
          </span>
          <span className="ml-auto text-[26px] text-ink-subtle tabular-nums">
            {state.round}번째 판
          </span>
          <LinkBadge transport={transport} status={link} />
        </header>

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
          <p className="text-[34px] text-ink-muted">{status.detail}</p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-8">
          {TEAMS.map((team) => (
            <TeamPanel
              key={team}
              team={team}
              state={state}
              joinUrl={
                joinable && linkReady
                  ? `${window.location.origin}${to.playClickBattle(roomId, team, peerId)}`
                  : null
              }
              closedLabel={joinable ? "연결 준비 중이에요" : "경기 중에는\n입장이 마감돼요"}
            />
          ))}
        </div>

        <p className="shrink-0 text-[24px] text-ink-subtle">
          팀당 최대 {BATTLE_RULES.maxPlayersPerTeam}명 · 한 폰에 한 명 ·{" "}
          {BATTLE_RULES.matchMs / 1000}초 동안 더 많이 누른 팀이 이겨요 · 로그인 없이 이름만
          적고 참가해요
        </p>
      </div>
    </ScaledStage>
  );
}

function LinkBadge({
  transport,
  status,
}: {
  transport: "webrtc" | "local";
  status: PeerStatus | null;
}) {
  if (transport === "local") {
    return <span className="text-[22px] text-ink-subtle">같은 브라우저 전용</span>;
  }
  const label =
    status === "open" ? "폰 연결 가능" : status === "error" ? "연결 오류 · 다시 시도 중" : "연결 준비 중";
  return (
    <span className="flex items-center gap-2 text-[22px] text-ink-subtle">
      <span
        aria-hidden="true"
        className={cn(
          "size-3 rounded-pill",
          status === "open" ? "bg-success" : status === "error" ? "bg-danger" : "bg-warning",
        )}
      />
      {label}
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
