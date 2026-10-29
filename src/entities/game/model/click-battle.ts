import { hasBlockedWord, stripInvisible } from "./name-filter";

/**
 * 클릭 배틀. A팀과 B팀이 폰으로 30초 동안 버튼을 눌러 더 많이 누른 팀이 이긴다.
 *
 * TV가 심판이다. 폰은 "몇 번 눌렀다"만 보내고, 점수 계산·시간·입장 마감은 모두
 * TV가 한다. 폰이 보낸 수를 그대로 믿지 않고 초당 상한으로 자른다.
 *
 * 흐름: 모집(LOBBY) → 양 팀에 한 명 이상이면 시작 카운트다운(COUNTDOWN, 입장 가능)
 * → 경기(PLAYING, 입장 마감) → 결과(RESULT) → 점수와 참가자를 비우고 다시 모집.
 *
 * 이 파일은 시간과 전송을 모르는 순수 함수다. 시각은 호출부가 넘긴다.
 */
export const TEAMS = ["A", "B"] as const;
export type Team = (typeof TEAMS)[number];

export const BATTLE_RULES = {
  maxPlayersPerTeam: 5,
  startCountdownMs: 10_000,
  matchMs: 30_000,
  resultMs: 10_000,
  /** 사람이 낼 수 있는 연타 속도의 넉넉한 상한. 넘는 수는 버린다. */
  maxTapsPerSecond: 15,
  nameMaxLength: 10,
} as const;

export type BattlePhase = "LOBBY" | "COUNTDOWN" | "PLAYING" | "RESULT";

export interface BattlePlayer {
  id: string;
  name: string;
  team: Team;
  taps: number;
  /** 마지막으로 연타를 받아 준 시각(ms). 초당 상한의 기준이다. */
  lastTapAt: number | null;
}

export interface BattleState {
  round: number;
  phase: BattlePhase;
  /** 지금 단계가 끝나는 시각(ms). 모집 중에는 null */
  phaseEndsAt: number | null;
  players: BattlePlayer[];
  scores: Record<Team, number>;
  winner: Team | "DRAW" | null;
}

/** 폰 → TV */
export type BattleClientMessage =
  | { kind: "join"; playerId: string; name: string; team: Team }
  | { kind: "taps"; playerId: string; count: number }
  | { kind: "leave"; playerId: string }
  /** 막 연결한 폰이 지금 상태를 달라고 한다. */
  | { kind: "hello"; playerId: string };

export type JoinRejection = "FULL" | "CLOSED";

/** TV → 폰 */
export type BattleHostMessage =
  | { kind: "state"; state: BattleState }
  | { kind: "rejected"; playerId: string; reason: JoinRejection };

export function initialBattle(round = 1): BattleState {
  return {
    round,
    phase: "LOBBY",
    phaseEndsAt: null,
    players: [],
    scores: { A: 0, B: 0 },
    winner: null,
  };
}

export function teamSize(state: BattleState, team: Team): number {
  return state.players.filter((player) => player.team === team).length;
}

const bothTeamsReady = (state: BattleState) =>
  TEAMS.every((team) => teamSize(state, team) > 0);

/**
 * TV에 보일 이름. 안 보이는 글자를 지우고 공백을 하나로 줄인 뒤 자른다. 비었거나
 * 공용 화면에 띄우면 안 되는 말이 있으면 팀 이름으로 부른다.
 */
export function normalizeName(name: string, team: Team): string {
  const cleaned = stripInvisible(name).replace(/\s+/g, " ").trim();
  const trimmed = cleaned.slice(0, BATTLE_RULES.nameMaxLength);
  if (!trimmed || hasBlockedWord(cleaned)) return `${team}팀 참가자`;
  return trimmed;
}

export interface ApplyResult {
  state: BattleState;
  reply?: BattleHostMessage;
}

export function applyClientMessage(
  state: BattleState,
  message: BattleClientMessage,
  now: number,
): ApplyResult {
  switch (message.kind) {
    case "hello":
      return { state };

    case "join": {
      const existing = state.players.find((player) => player.id === message.playerId);
      if (existing) return { state };
      if (state.phase === "PLAYING" || state.phase === "RESULT") {
        return {
          state,
          reply: { kind: "rejected", playerId: message.playerId, reason: "CLOSED" },
        };
      }
      if (teamSize(state, message.team) >= BATTLE_RULES.maxPlayersPerTeam) {
        return {
          state,
          reply: { kind: "rejected", playerId: message.playerId, reason: "FULL" },
        };
      }
      const joined: BattleState = {
        ...state,
        players: [
          ...state.players,
          {
            id: message.playerId,
            name: normalizeName(message.name, message.team),
            team: message.team,
            taps: 0,
            lastTapAt: null,
          },
        ],
      };
      // 양 팀이 모이면 카운트다운을 시작한다. 그동안 더 들어올 수 있다.
      if (joined.phase === "LOBBY" && bothTeamsReady(joined)) {
        return {
          state: {
            ...joined,
            phase: "COUNTDOWN",
            phaseEndsAt: now + BATTLE_RULES.startCountdownMs,
          },
        };
      }
      return { state: joined };
    }

    case "leave": {
      if (state.phase === "PLAYING" || state.phase === "RESULT") {
        // 경기 중에 나가도 점수는 남긴다. 다음 판에서 비운다.
        return { state };
      }
      const left: BattleState = {
        ...state,
        players: state.players.filter((player) => player.id !== message.playerId),
      };
      if (left.phase === "COUNTDOWN" && !bothTeamsReady(left)) {
        return { state: { ...left, phase: "LOBBY", phaseEndsAt: null } };
      }
      return { state: left };
    }

    case "taps": {
      if (state.phase !== "PLAYING") return { state };
      const player = state.players.find((item) => item.id === message.playerId);
      if (!player || !Number.isFinite(message.count) || message.count <= 0) {
        return { state };
      }
      const startedAt = (state.phaseEndsAt ?? now) - BATTLE_RULES.matchMs;
      const since = player.lastTapAt ?? startedAt;
      const allowance = Math.max(
        1,
        Math.floor(((now - since) / 1000) * BATTLE_RULES.maxTapsPerSecond),
      );
      const accepted = Math.min(Math.floor(message.count), allowance);
      return {
        state: {
          ...state,
          players: state.players.map((item) =>
            item.id === player.id
              ? { ...item, taps: item.taps + accepted, lastTapAt: now }
              : item,
          ),
          scores: { ...state.scores, [player.team]: state.scores[player.team] + accepted },
        },
      };
    }
  }
}

/** 시간이 지나 단계가 바뀌었으면 다음 상태를, 아니면 같은 객체를 돌려준다. */
export function advanceBattle(state: BattleState, now: number): BattleState {
  if (state.phaseEndsAt === null || now < state.phaseEndsAt) return state;
  switch (state.phase) {
    case "LOBBY":
      return state;
    case "COUNTDOWN":
      return {
        ...state,
        phase: "PLAYING",
        phaseEndsAt: state.phaseEndsAt + BATTLE_RULES.matchMs,
      };
    case "PLAYING": {
      const { A, B } = state.scores;
      return {
        ...state,
        phase: "RESULT",
        phaseEndsAt: state.phaseEndsAt + BATTLE_RULES.resultMs,
        winner: A === B ? "DRAW" : A > B ? "A" : "B",
      };
    }
    case "RESULT":
      return initialBattle(state.round + 1);
  }
}

/** 지금 단계의 남은 초(올림). 모집 중이면 null */
export function secondsLeft(state: BattleState, now: number): number | null {
  if (state.phaseEndsAt === null) return null;
  return Math.max(0, Math.ceil((state.phaseEndsAt - now) / 1000));
}
