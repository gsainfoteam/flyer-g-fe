import { hasBlockedWord, stripInvisible } from "./name-filter";

/**
 * 전단지 피하기. 한 명이 폰의 좌우 버튼으로 TV 속 전단지 로고를 움직여 떨어지는 전단지를
 * 피한다. 최대 40초, 하트 3개. gsainfoteam/flyer-g-avoiding-game의 규칙을 옮겼다.
 *
 * TV가 심판이다. 폰은 "왼쪽/오른쪽/멈춤"만 보내고, 움직임·전단지·충돌·점수는 모두 TV가
 * 계산한다. 같은 결과가 나오게 난수는 상태 안의 씨앗으로 만든다(테스트에서 다시 돌린다).
 *
 * 흐름: 모집(LOBBY, QR) → 참가하면 3초 카운트다운(COUNTDOWN) → 플레이(PLAYING)
 * → 결과(RESULT, 12초) → 새 QR로 다시 모집.
 *
 * 좌표는 화면 비율(0~1)이다. x는 왼쪽→오른쪽, y는 위→아래. 화면은 비율대로 그린다.
 * 이 파일은 시간과 전송을 모르는 순수 함수다. 시각은 호출부가 넘긴다.
 */
export const DODGE_RULES = {
  countdownMs: 3_000,
  durationMs: 40_000,
  lives: 3,
  /** 부딪힌 뒤 이만큼은 다시 부딪히지 않는다. */
  invincibleMs: 1_200,
  /** 초당 움직이는 거리(화면 폭 비율) */
  playerSpeed: 0.65,
  minX: 0.045,
  maxX: 0.955,
  /** 폰은 누르고 있는 동안 방향을 되풀이해 보낸다. 이만큼 말이 없으면 멈춘다(손 뗌 유실 대비). */
  inputTimeoutMs: 600,
  resultMs: 12_000,
  /** 플레이 중 폰 연결이 끊기면 이만큼 기다렸다가 판을 취소한다(기록하지 않는다). */
  disconnectGraceMs: 15_000,
  /** 버틴 1초당 점수. 시간 점수가 너무 빨리 올라 피한 전단지·보너스가 묻히지 않게 50으로 둔다. */
  pointsPerSecond: 50,
  dodgePoints: 25,
  bonusPoints: 300,
  hitPenalty: 150,
  nameMaxLength: 12,
  /** 계산 간격 */
  stepMs: 1_000 / 30,
} as const;

/** 로고(플레이어)의 세로 위치와 충돌 판정 크기 */
export const PLAYER_Y = 0.86;
const HIT_X = 0.065;
const HIT_Y = 0.075;
/** 탭이 오래 멈췄다 돌아왔을 때 한 번에 계산하는 최대 시간. 넘는 시간은 건너뛴다. */
const MAX_CATCH_UP_MS = 2_000;

export type DodgePhase = "LOBBY" | "COUNTDOWN" | "PLAYING" | "RESULT";
export type Direction = -1 | 0 | 1;

export interface Flyer {
  id: number;
  x: number;
  y: number;
  /** 초당 떨어지는 거리 */
  speed: number;
  /** 기울기(도). 그림용 */
  angle: number;
  /** 전단지 색. 그림용 */
  variant: 0 | 1 | 2;
  /** 피해서 바닥까지 갔다(점수에 셌다) */
  counted: boolean;
}

export interface DodgeItem {
  id: number;
  x: number;
  y: number;
  speed: number;
  /** BONUS: +300점, HEART: 하트 +1(최대 3) */
  kind: "BONUS" | "HEART";
}

export interface DodgePlayer {
  id: string;
  name: string;
  x: number;
  direction: Direction;
  inputAt: number;
  lives: number;
  dodged: number;
  bonus: number;
  penalties: number;
  invincibleUntil: number;
  /** 연결이 끊긴 시각. 돌아오면 null */
  disconnectedAt: number | null;
}

export interface DodgeResult {
  name: string;
  score: number;
  /** 버틴 시간(ms) */
  survivedMs: number;
}

export interface DodgeState {
  round: number;
  /**
   * 이번 판 참가 QR의 표. 판이 바뀌면 바뀐다. 지난 판 QR(폰에 남은 주소)로는 다시
   * 들어오지 못하게 해서, 한 사람이 같은 주소로 계속 차지하지 않게 한다.
   */
  ticket: string;
  phase: DodgePhase;
  /** 지금 단계가 끝나는 시각(ms). 모집 중에는 null */
  phaseEndsAt: number | null;
  /** 플레이가 시작된 시각 */
  startedAt: number | null;
  /** 여기까지 계산했다 */
  simulatedAt: number | null;
  lastSpawnAt: number | null;
  nextId: number;
  /** 난수 씨앗(mulberry32 상태) */
  seed: number;
  player: DodgePlayer | null;
  flyers: Flyer[];
  items: DodgeItem[];
  result: DodgeResult | null;
}

/** 폰 → TV */
export type DodgeClientMessage =
  | { kind: "join"; playerId: string; name: string; ticket: string }
  | { kind: "move"; playerId: string; direction: Direction }
  | { kind: "leave"; playerId: string }
  | { kind: "hello"; playerId: string };

export type DodgeRejection = "BUSY" | "STALE_QR";

/**
 * 폰에 보내는 요약. 전단지 위치는 보내지 않는다(폰은 TV를 보고 피한다). 백엔드 중계의
 * 메시지 크기·빈도 한도 안에 작게 둔다.
 */
export interface DodgeView {
  round: number;
  ticket: string;
  phase: DodgePhase;
  phaseEndsAt: number | null;
  player: { id: string; name: string; lives: number; score: number } | null;
  result: DodgeResult | null;
  /** 결과의 이 TV 순위(1부터). 5위 밖이거나 결과가 아니면 null */
  rank: number | null;
}

/** TV → 폰. `now`: 보낼 때 TV의 시각(ms). 폰은 이것으로 TV 시계와의 차이를 잰다. */
export type DodgeHostMessage =
  | { kind: "state"; view: DodgeView; now?: number }
  | { kind: "rejected"; playerId: string; reason: DodgeRejection };

/** mulberry32. [0, 1) 값과 다음 씨앗 */
function nextRandom(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4_294_967_296, next];
}

/** 상태의 씨앗을 이어 쓰는 난수. 다 쓰면 `seed`를 상태에 돌려놓는다. */
function randomFrom(seed: number) {
  let current = seed;
  return {
    next() {
      const [value, following] = nextRandom(current);
      current = following;
      return value;
    },
    get seed() {
      return current;
    },
  };
}

function newTicket(random: { next(): number }): string {
  return Math.floor(random.next() * 36 ** 6)
    .toString(36)
    .padStart(6, "0");
}

export function initialDodge(round = 1, seed = 1): DodgeState {
  const random = randomFrom(seed);
  const ticket = newTicket(random);
  return {
    round,
    ticket,
    phase: "LOBBY",
    phaseEndsAt: null,
    startedAt: null,
    simulatedAt: null,
    lastSpawnAt: null,
    nextId: 1,
    seed: random.seed,
    player: null,
    flyers: [],
    items: [],
    result: null,
  };
}

/** 다음 판 모집. 표가 바뀐다. */
const nextLobby = (state: DodgeState) => initialDodge(state.round + 1, state.seed);

/**
 * TV에 보일 이름. 안 보이는 글자를 지우고 공백을 하나로 줄인 뒤 자른다. 비었거나
 * 공용 화면에 띄우면 안 되는 말이 있으면 "익명"으로 부른다.
 */
export function normalizeDodgeName(name: string): string {
  const cleaned = stripInvisible(name).replace(/\s+/g, " ").trim();
  const trimmed = cleaned.slice(0, DODGE_RULES.nameMaxLength);
  if (!trimmed || hasBlockedWord(cleaned)) return "익명";
  return trimmed;
}

/** 지금 점수. 버틴 시간 × 50 + 피한 전단지 × 25 + 보너스 − 부딪힘 감점(0 아래로는 안 감) */
export function dodgeScore(player: DodgePlayer, elapsedMs: number): number {
  const seconds = Math.min(Math.max(elapsedMs, 0), DODGE_RULES.durationMs) / 1_000;
  return Math.max(
    0,
    Math.round(seconds * DODGE_RULES.pointsPerSecond) +
      player.dodged * DODGE_RULES.dodgePoints +
      player.bonus -
      player.penalties,
  );
}

/** 누군가 참가해 판이 살아 있는가. 이 동안 플레이어는 순환을 멈춘다. */
export const isDodgeActive = (state: DodgeState) => state.phase !== "LOBBY";

export interface DodgeApplyResult {
  state: DodgeState;
  reply?: DodgeHostMessage;
}

export function applyDodgeMessage(
  state: DodgeState,
  message: DodgeClientMessage,
  now: number,
): DodgeApplyResult {
  const isPlayer = state.player?.id === message.playerId;
  switch (message.kind) {
    case "hello":
      return { state: isPlayer ? reconnected(state) : state };
    case "join": {
      if (isPlayer) return { state: reconnected(state) };
      const reject = (reason: DodgeRejection): DodgeApplyResult => ({
        state,
        reply: { kind: "rejected", playerId: message.playerId, reason },
      });
      if (state.phase !== "LOBBY") return reject("BUSY");
      if (message.ticket !== state.ticket) return reject("STALE_QR");
      return {
        state: {
          ...state,
          phase: "COUNTDOWN",
          phaseEndsAt: now + DODGE_RULES.countdownMs,
          player: {
            id: message.playerId,
            name: normalizeDodgeName(message.name),
            x: 0.5,
            direction: 0,
            inputAt: now,
            lives: DODGE_RULES.lives,
            dodged: 0,
            bonus: 0,
            penalties: 0,
            invincibleUntil: 0,
            disconnectedAt: null,
          },
        },
      };
    }
    case "move": {
      if (!isPlayer || !state.player) return { state };
      return {
        state: {
          ...state,
          player: {
            ...state.player,
            direction: message.direction,
            inputAt: now,
            disconnectedAt: null,
          },
        },
      };
    }
    case "leave": {
      if (!isPlayer || !state.player) return { state };
      // 시작 전에 나가면 판을 비운다. 플레이 중이면 잠깐 기다린다(같은 탭으로 돌아올 수 있다).
      if (state.phase === "COUNTDOWN") return { state: nextLobby(state) };
      if (state.phase === "PLAYING") {
        return {
          state: {
            ...state,
            player: { ...state.player, direction: 0, disconnectedAt: state.player.disconnectedAt ?? now },
          },
        };
      }
      return { state };
    }
  }
}

function reconnected(state: DodgeState): DodgeState {
  if (!state.player?.disconnectedAt) return state;
  return { ...state, player: { ...state.player, disconnectedAt: null } };
}

/** 한 칸(stepMs) 계산. 원본 서버의 tick과 같은 규칙이다. */
function step(state: DodgeState, at: number): DodgeState {
  const player = state.player!;
  const startedAt = state.startedAt!;
  const dt = DODGE_RULES.stepMs / 1_000;
  const elapsed = (at - startedAt) / 1_000;
  const random = randomFrom(state.seed);
  let nextId = state.nextId;
  let lastSpawnAt = state.lastSpawnAt!;

  const direction = at - player.inputAt > DODGE_RULES.inputTimeoutMs ? 0 : player.direction;
  const x = Math.max(
    DODGE_RULES.minX,
    Math.min(DODGE_RULES.maxX, player.x + direction * dt * DODGE_RULES.playerSpeed),
  );

  const flyers = state.flyers.map((flyer) => ({ ...flyer, y: flyer.y + flyer.speed * dt }));
  const items = state.items.map((item) => ({ ...item, y: item.y + item.speed * dt }));

  // 처음엔 느리게, 갈수록 더 자주·빠르게 떨어진다.
  if (at - lastSpawnAt > Math.max(140, 700 - elapsed * 20)) {
    lastSpawnAt = at;
    flyers.push({
      id: nextId++,
      x: random.next() * 0.92 + 0.04,
      y: -0.1,
      speed: Math.min(1.05, 0.34 + elapsed * 0.018 + random.next() * 0.14),
      angle: random.next() * 50 - 25,
      variant: Math.floor(random.next() * 3) as 0 | 1 | 2,
      counted: false,
    });
    if (random.next() < Math.min(0.32, 0.1 + elapsed * 0.004)) {
      items.push({
        id: nextId++,
        x: random.next() * 0.9 + 0.05,
        y: -0.08,
        speed: Math.min(0.85, 0.3 + elapsed * 0.012),
        kind: random.next() < 0.8 ? "BONUS" : "HEART",
      });
    }
  }

  let { lives, dodged, bonus, penalties, invincibleUntil } = player;
  const near = (item: { x: number; y: number }) =>
    Math.abs(item.x - x) < HIT_X && Math.abs(item.y - PLAYER_Y) < HIT_Y;

  const keptFlyers: Flyer[] = [];
  for (const flyer of flyers) {
    if (near(flyer) && at > invincibleUntil) {
      lives -= 1;
      penalties += DODGE_RULES.hitPenalty;
      invincibleUntil = at + DODGE_RULES.invincibleMs;
      continue; // 부딪힌 전단지는 치운다.
    }
    if (!flyer.counted && flyer.y > 0.96) {
      flyer.counted = true;
      dodged += 1;
    }
    if (flyer.y < 1.15) keptFlyers.push(flyer);
  }
  const keptItems: DodgeItem[] = [];
  for (const item of items) {
    if (near(item)) {
      if (item.kind === "BONUS") bonus += DODGE_RULES.bonusPoints;
      else lives = Math.min(DODGE_RULES.lives, lives + 1);
      continue;
    }
    if (item.y < 1.1) keptItems.push(item);
  }

  return {
    ...state,
    seed: random.seed,
    nextId,
    lastSpawnAt,
    simulatedAt: at,
    flyers: keptFlyers,
    items: keptItems,
    player: { ...player, x, lives, dodged, bonus, penalties, invincibleUntil },
  };
}

/** 판을 끝내고 결과를 남긴다. 점수는 게임 중과 같은 식으로 셈한다. */
function finish(state: DodgeState, endedAt: number): DodgeState {
  const player = state.player!;
  const survivedMs = Math.min(endedAt - state.startedAt!, DODGE_RULES.durationMs);
  return {
    ...state,
    phase: "RESULT",
    phaseEndsAt: endedAt + DODGE_RULES.resultMs,
    flyers: [],
    items: [],
    result: { name: player.name, score: dodgeScore(player, survivedMs), survivedMs },
  };
}

/** 시간이 지나 바뀐 상태. 바뀐 것이 없으면 같은 객체를 돌려준다. */
export function advanceDodge(state: DodgeState, now: number): DodgeState {
  switch (state.phase) {
    case "LOBBY":
      return state;
    case "COUNTDOWN": {
      if (now < state.phaseEndsAt!) return state;
      const startedAt = state.phaseEndsAt!;
      const playing: DodgeState = {
        ...state,
        phase: "PLAYING",
        phaseEndsAt: startedAt + DODGE_RULES.durationMs,
        startedAt,
        simulatedAt: startedAt,
        lastSpawnAt: startedAt,
      };
      return advanceDodge(playing, now);
    }
    case "PLAYING": {
      const disconnectedAt = state.player?.disconnectedAt ?? null;
      if (disconnectedAt !== null && now - disconnectedAt > DODGE_RULES.disconnectGraceMs) {
        return nextLobby(state);
      }
      const endsAt = state.phaseEndsAt!;
      let current = state;
      // 오래 멈췄다 돌아왔으면 지난 시간 일부는 건너뛴다(전단지가 한꺼번에 쏟아지지 않게).
      let at = Math.max(current.simulatedAt!, now - MAX_CATCH_UP_MS);
      if (at !== current.simulatedAt) current = { ...current, simulatedAt: at };
      while (at + DODGE_RULES.stepMs <= Math.min(now, endsAt)) {
        at += DODGE_RULES.stepMs;
        current = step(current, at);
        if (current.player!.lives <= 0) return finish(current, at);
      }
      if (now >= endsAt) return finish(current, endsAt);
      return current;
    }
    case "RESULT":
      return now < state.phaseEndsAt! ? state : nextLobby(state);
  }
}

/** 폰에 보낼 요약. 순위는 TV가 저장한 순위에서 따로 넘긴다. */
export function dodgeView(state: DodgeState, now: number, rank: number | null = null): DodgeView {
  const { player } = state;
  return {
    round: state.round,
    ticket: state.ticket,
    phase: state.phase,
    phaseEndsAt: state.phaseEndsAt,
    player: player
      ? {
          id: player.id,
          name: player.name,
          lives: player.lives,
          score:
            state.phase === "PLAYING" ? dodgeScore(player, now - state.startedAt!) : 0,
        }
      : null,
    result: state.result,
    rank: state.phase === "RESULT" ? rank : null,
  };
}

/** 지금 단계의 남은 초(올림). 모집 중이면 null */
export function dodgeSecondsLeft(phaseEndsAt: number | null, now: number): number | null {
  if (phaseEndsAt === null) return null;
  return Math.max(0, Math.ceil((phaseEndsAt - now) / 1_000));
}
