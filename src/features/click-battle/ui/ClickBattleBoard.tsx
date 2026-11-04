import type { ReactNode } from "react";
import {
  BATTLE_RULES,
  TEAMS,
  secondsLeft,
} from "@/entities/game/model/click-battle";
import type { BattleState, Team } from "@/entities/game/model/click-battle";
import type { GameLinkStatus } from "@/shared/lib/ws-game-channel";
import { QRCodeBox } from "@/shared/components/QRCodeBox";
import { SurveyCorner } from "@/shared/components/SurveyCorner";
import type { EventSurvey } from "@/shared/components/SurveyCorner";
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

function statusOf(
  state: BattleState,
  seconds: number | null,
): { title: string; detail: string } {
  switch (state.phase) {
    case "LOBBY":
      return {
        title: "참가자 모집 중",
        detail: "양 팀에 한 명씩 참가하면 시작",
      };
    case "COUNTDOWN":
      return { title: `${seconds}초 뒤 시작`, detail: "참가 가능" };
    case "PLAYING":
      return { title: `${seconds}초`, detail: "지금 누르세요!" };
    case "RESULT":
      return {
        title: state.winner === "DRAW" ? "무승부!" : `${state.winner}팀 승리!`,
        detail: `${seconds}초 후 다음 참가자 모집`,
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
  /**
   * 방을 열지 않고 모양만 보여 준다(관리자 미리보기). QR 자리에 빈 상자를 둔다.
   * 찍어도 붙을 곳이 없는 QR을 띄우지 않기 위해서다.
   */
  previewOnly?: boolean;
  /**
   * 행사 시간대 화면에만 붙이는 설문 QR. 두 팀 칸 아래 전체 폭 띠에 둔다. 팀 참가 QR과
   * 자리·크기가 달라 헷갈리지 않고, 양 팀 칸의 대칭도 깨지 않는다.
   */
  survey?: EventSurvey | null;
}

export function ClickBattleBoard({
  roomId,
  state,
  now,
  link,
  local,
  header,
  idleHint,
  previewOnly = false,
  survey = null,
}: ClickBattleBoardProps) {
  // 서버 중계는 방이 열려야(TV 인증) QR을 보여 준다. 그전에 찍으면 붙을 곳이 없다.
  const linkReady = local || link === "open";
  const seconds = secondsLeft(state, now);
  const status = statusOf(state, seconds);
  const joinable = state.phase === "LOBBY" || state.phase === "COUNTDOWN";

  return (
    <div className="flex h-full flex-col gap-8">
      {header}

      <div className="flex shrink-0 items-center gap-8">
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
        <p className="text-[34px] text-ink-muted">
          {state.phase === "LOBBY" && state.players.length === 0 && idleHint
            ? idleHint
            : status.detail}
        </p>
        {survey && (
          <SurveyCorner
            survey={survey}
            finished={state.phase === "RESULT"}
            qrSize="band"
            className="ml-auto"
          />
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-8">
        {TEAMS.map((team) => (
          <TeamPanel
            key={team}
            team={team}
            state={state}
            compact={survey !== null}
            previewOnly={previewOnly}
            joinUrl={
              !previewOnly && joinable && linkReady
                ? `${window.location.origin}${to.playClickBattle(roomId, team)}`
                : null
            }
            closedLabel={
              !joinable
                ? "경기 중에는\n참가할 수 없습니다"
                : link === "unauthorized"
                  ? "게임을 시작할 수 없습니다\n기기 설정 링크로 다시 연결하세요"
                  : link === "replaced"
                    ? "다른 화면에서\n이 TV의 게임이 실행 중입니다"
                    : "연결 준비 중"
            }
          />
        ))}
      </div>

      <p className="shrink-0 text-[24px] text-ink-subtle">{RULES_TEXT}</p>
    </div>
  );
}

const RULES_TEXT = `팀당 최대 ${BATTLE_RULES.maxPlayersPerTeam}명 · 한 폰에 한 명 · ${
  BATTLE_RULES.matchMs / 1000
}초 동안 더 많이 누른 팀 승리 · 로그인 없이 이름 입력 후 참가`;

const LINK_LABEL: Record<GameLinkStatus, { text: string; dot: string }> = {
  connecting: { text: "서버 연결 중", dot: "bg-warning" },
  reconnecting: { text: "다시 연결 중", dot: "bg-warning" },
  open: { text: "폰 연결 가능", dot: "bg-success" },
  "waiting-host": { text: "서버 연결 중", dot: "bg-warning" },
  unauthorized: { text: "기기 인증 실패", dot: "bg-danger" },
  replaced: { text: "다른 화면에서 열림", dot: "bg-danger" },
};

export function LinkBadge({
  local,
  status,
}: {
  local: boolean;
  status: GameLinkStatus | null;
}) {
  if (local) {
    return (
      <span className="text-[22px] text-ink-subtle">같은 브라우저 전용</span>
    );
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
  compact,
  joinUrl,
  closedLabel,
  previewOnly,
}: {
  team: Team;
  state: BattleState;
  /** 아래 설문 띠가 있을 때. 점수 글자와 안쪽 여백을 줄여 같은 높이에 담는다. */
  compact: boolean;
  previewOnly: boolean;
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
        "flex min-h-0 gap-10 rounded-tv-card bg-surface",
        compact ? "px-12 py-8" : "px-14 py-12",
        isWinner && `ring-6 ${style.ring}`,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-6">
          <p className={cn("text-[56px] font-extrabold", style.text)}>
            {team}팀
          </p>
          <div
            className="flex items-center gap-2"
            aria-label={`${players.length}명 참가`}
          >
            {Array.from(
              { length: BATTLE_RULES.maxPlayersPerTeam },
              (_, index) => (
                <span
                  key={index}
                  className={cn(
                    "size-5 rounded-pill",
                    index < players.length ? style.dot : "bg-surface-muted",
                  )}
                />
              ),
            )}
            <span className="ml-2 text-[28px] text-ink-subtle tabular-nums">
              {players.length} / {BATTLE_RULES.maxPlayersPerTeam}
            </span>
          </div>
        </div>

        <p
          className={cn(
            // 글자 크기를 leading-none보다 앞에 둔다. 뒤에 두면 cn이 줄 높이를 지운다.
            compact ? "text-[150px]" : "text-[220px]",
            "mt-auto leading-none font-extrabold tracking-tight tabular-nums",
            style.text,
          )}
        >
          {state.scores[team].toLocaleString("ko-KR")}
        </p>
        <p className={cn("text-[28px] font-bold text-ink-subtle", compact ? "mt-1" : "mt-3")}>
          회 클릭
        </p>

        <p className={cn("shrink-0 truncate text-[28px] text-ink-muted", compact ? "mt-4" : "mt-8")}>
          {players.length > 0
            ? players.map((player) => player.name).join(" · ")
            : "참가자 없음"}
        </p>
      </div>

      <div className="flex w-[280px] shrink-0 flex-col items-center justify-end gap-4">
        {previewOnly ? (
          <>
            {/* QR과 같은 240px 자리. 관리 화면용 빈 QR 상자는 글자가 작아 TV에서 안 읽힌다. */}
            <div
              role="img"
              aria-label="QR 미리보기 · 실제 TV에서 QR 표시"
              className="grid size-[240px] place-items-center rounded-tv-poster border-2 border-dashed border-line-strong text-center text-[26px] leading-snug text-ink-subtle"
            >
              미리보기
              <br />
              QR 자리
            </div>
            <p className={cn("text-[32px] font-extrabold", style.text)}>
              {team}팀으로 참가
            </p>
          </>
        ) : joinUrl ? (
          <>
            <QRCodeBox value={joinUrl} size="tv" />
            <p className={cn("text-[32px] font-extrabold", style.text)}>
              {team}팀으로 참가
            </p>
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
