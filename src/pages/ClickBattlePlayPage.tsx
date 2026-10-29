import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useSearchParams } from "react-router";
import { BATTLE_RULES, TEAMS, secondsLeft } from "@/entities/game/model/click-battle";
import type { Team } from "@/entities/game/model/click-battle";
import { useBattlePlayer } from "@/features/click-battle/model/use-battle-player";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

/**
 * 클릭 배틀 참가 (폰). TV의 팀별 QR로 로그인 없이 들어와 이름만 적는다.
 *
 * 경기 중에는 화면 대부분을 누르는 버튼으로 쓴다. 점수의 원본은 TV이고, 이 화면의
 * "내가 누른 수"는 바로 반응하도록 폰에서 센 값이다.
 */
const TEAM_STYLE: Record<Team, { text: string; button: string }> = {
  A: { text: "text-accent", button: "bg-accent text-accent-on active:bg-accent-700" },
  B: { text: "text-info", button: "bg-info text-ink-inverse active:bg-info-strong" },
};

function readTeam(value: string | null): Team {
  return (TEAMS as readonly string[]).includes(value ?? "") ? (value as Team) : "A";
}

/** 남은 초를 그리려고 1초보다 촘촘히 다시 그린다. */
function useNow(intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function ClickBattlePlayPage() {
  const { roomId = "lobby" } = useParams();
  const [searchParams] = useSearchParams();
  const team = readTeam(searchParams.get("team"));
  const player = useBattlePlayer(roomId, { hostPeerId: searchParams.get("peer") });
  const [name, setName] = useState("");
  const now = useNow();
  const style = TEAM_STYLE[team];

  const state = player.state;
  const seconds = state ? secondsLeft(state, now) : null;

  if (!player.connected || !state) {
    return (
      <Notice
        title="TV에 연결하는 중이에요"
        description="TV와 같은 와이파이에 있는지 확인하고, 계속 안 되면 TV 화면의 QR을 다시 찍어 보세요."
      />
    );
  }

  if (!player.me) {
    if (state.phase === "PLAYING" || state.phase === "RESULT") {
      return (
        <Notice
          title="지금은 경기 중이에요"
          description={`${seconds ?? 0}초쯤 뒤에 다음 판 참가자를 모집해요. 이 화면을 열어 두세요.`}
        />
      );
    }
    return (
      <form
        className="flex flex-1 flex-col gap-6 pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          player.join(name, team);
        }}
      >
        <div>
          <p className={cn("text-label font-bold", style.text)}>클릭 배틀</p>
          <h1 className="mt-2 text-title text-ink">
            <span className={style.text}>{team}팀</span>으로 참가해요
          </h1>
          <p className="mt-2 text-body text-ink-muted">
            로그인은 필요 없어요. TV에 보일 이름만 적어 주세요.
          </p>
        </div>
        <Input
          aria-label="이름"
          value={name}
          maxLength={BATTLE_RULES.nameMaxLength}
          placeholder="예: 3층 하윤"
          onChange={(event) => setName(event.target.value)}
          className="h-12 text-subhead"
        />
        {player.rejection && (
          <p role="alert" className="text-label text-danger">
            {player.rejection === "FULL"
              ? `${team}팀이 다 찼어요. 다른 팀 QR로 참가하거나 다음 판을 기다려 주세요.`
              : "방금 경기가 시작됐어요. 다음 판을 기다려 주세요."}
          </p>
        )}
        <Button type="submit" size="lg" className="mt-auto h-14 text-subhead">
          참가하기
        </Button>
      </form>
    );
  }

  const myTeam = player.me.team;
  const myStyle = TEAM_STYLE[myTeam];

  if (state.phase === "PLAYING") {
    return (
      <div className="flex flex-1 flex-col gap-4 pt-2">
        <Scoreboard scores={state.scores} myTeam={myTeam} seconds={seconds} />
        <button
          type="button"
          // 손가락이 닿는 순간 센다. click을 기다리면 연타가 늦게 잡힌다.
          onPointerDown={(event) => {
            event.preventDefault();
            player.tap();
          }}
          className={cn(
            "flex flex-1 touch-manipulation flex-col items-center justify-center rounded-card select-none",
            myStyle.button,
          )}
        >
          <span className="text-[64px] leading-none font-extrabold tabular-nums">
            {player.localTaps.toLocaleString("ko-KR")}
          </span>
          <span className="mt-3 text-subhead font-bold">누르세요!</span>
        </button>
      </div>
    );
  }

  if (state.phase === "RESULT") {
    const won = state.winner === myTeam;
    return (
      <Notice
        title={state.winner === "DRAW" ? "무승부!" : won ? "이겼어요!" : "아쉽게 졌어요"}
        description={`나는 ${player.me.taps.toLocaleString("ko-KR")}번 눌렀어요. ${seconds ?? 0}초 뒤 다음 판을 모집해요.`}
      >
        <Scoreboard scores={state.scores} myTeam={myTeam} seconds={null} />
      </Notice>
    );
  }

  return (
    <Notice
      title={
        state.phase === "COUNTDOWN"
          ? `${seconds ?? 0}초 뒤 시작해요`
          : "상대 팀을 기다리는 중이에요"
      }
      description={`${player.me.name} · ${myTeam}팀으로 참가했어요. 시작하면 화면이 버튼으로 바뀌어요.`}
    />
  );
}

function Scoreboard({
  scores,
  myTeam,
  seconds,
}: {
  scores: Record<Team, number>;
  myTeam: Team;
  seconds: number | null;
}) {
  return (
    <div className="flex items-center justify-between rounded-card bg-surface px-5 py-3">
      {TEAMS.map((team) => (
        <p
          key={team}
          className={cn(
            "text-subhead tabular-nums",
            TEAM_STYLE[team].text,
            team === myTeam && "font-extrabold",
          )}
        >
          {team}팀 {scores[team].toLocaleString("ko-KR")}
        </p>
      ))}
      {seconds !== null && (
        <p className="order-first text-title text-ink tabular-nums">{seconds}초</p>
      )}
    </div>
  );
}

function Notice({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div role="status" className="flex flex-1 flex-col justify-center gap-4 text-center">
      <h1 className="text-title text-ink">{title}</h1>
      <p className="text-body text-ink-muted">{description}</p>
      {children}
    </div>
  );
}
