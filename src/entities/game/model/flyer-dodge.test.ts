import { describe, expect, it } from "vitest";
import { addDodgeRecord, readDodgeRanking } from "./dodge-ranking";
import {
  DODGE_RULES,
  PLAYER_Y,
  advanceDodge,
  applyDodgeMessage,
  dodgeScore,
  dodgeView,
  initialDodge,
  normalizeDodgeName,
} from "./flyer-dodge";
import type { DodgeClientMessage, DodgeState } from "./flyer-dodge";
import { parseDodgeMessage } from "./flyer-dodge-messages";

const T0 = 1_000_000;

const apply = (state: DodgeState, message: DodgeClientMessage, now = T0) =>
  applyDodgeMessage(state, message, now);

/** 한 명이 참가해 카운트다운이 막 끝난 상태 */
function playing(seed = 7): DodgeState {
  const lobby = initialDodge(1, seed);
  const joined = apply(lobby, { kind: "join", playerId: "p1", name: "하윤", ticket: lobby.ticket });
  return advanceDodge(joined.state, T0 + DODGE_RULES.countdownMs);
}

const startedAt = T0 + DODGE_RULES.countdownMs;

describe("전단지 피하기 · 입장", () => {
  it("QR의 표가 맞으면 참가하고 3초 뒤 시작한다", () => {
    const lobby = initialDodge(1, 3);
    const { state } = apply(lobby, { kind: "join", playerId: "p1", name: " 하윤 ", ticket: lobby.ticket });
    expect(state).toMatchObject({ phase: "COUNTDOWN", phaseEndsAt: T0 + 3_000 });
    expect(state.player).toMatchObject({ name: "하윤", lives: 3, x: 0.5 });
    expect(advanceDodge(state, T0 + 2_999).phase).toBe("COUNTDOWN");
    expect(advanceDodge(state, T0 + 3_000)).toMatchObject({ phase: "PLAYING", startedAt: T0 + 3_000 });
  });

  it("다른 사람이 하는 중이거나 지난 판 QR이면 받지 않는다", () => {
    const lobby = initialDodge(1, 3);
    const stale = apply(lobby, { kind: "join", playerId: "p1", name: "a", ticket: "old" });
    expect(stale.reply).toEqual({ kind: "rejected", playerId: "p1", reason: "STALE_QR" });
    const busy = apply(playing(), { kind: "join", playerId: "p2", name: "b", ticket: lobby.ticket });
    expect(busy.reply).toEqual({ kind: "rejected", playerId: "p2", reason: "BUSY" });
  });

  it("판이 끝나 다시 모집하면 QR의 표가 바뀐다", () => {
    const lobby = initialDodge(1, 3);
    let state = playing(3);
    state = advanceDodge(state, startedAt + DODGE_RULES.durationMs);
    expect(state.phase).toBe("RESULT");
    state = advanceDodge(state, startedAt + DODGE_RULES.durationMs + DODGE_RULES.resultMs);
    expect(state).toMatchObject({ phase: "LOBBY", round: 2, player: null });
    expect(state.ticket).not.toBe(lobby.ticket);
  });

  it("이름은 정리하고, 공용 화면에 띄우면 안 되는 말이면 익명으로 부른다", () => {
    expect(normalizeDodgeName("  하윤​  최고  ")).toBe("하윤 최고");
    expect(normalizeDodgeName("ㅅ.ㅂ")).toBe("익명");
    expect(normalizeDodgeName("")).toBe("익명");
    expect(normalizeDodgeName("가".repeat(20))).toHaveLength(DODGE_RULES.nameMaxLength);
  });
});

describe("전단지 피하기 · 플레이", () => {
  it("누르고 있는 방향으로 움직이고, 화면 끝에서 멈추고, 입력이 끊기면 선다", () => {
    let state = apply(playing(), { kind: "move", playerId: "p1", direction: 1 }, startedAt).state;
    state = advanceDodge(state, startedAt + 500);
    expect(state.player!.x).toBeCloseTo(0.5 + 0.65 * 0.5, 1);
    // 600ms 넘게 말이 없으면 멈춘다.
    const later = advanceDodge(state, startedAt + 2_000);
    expect(advanceDodge(later, startedAt + 3_000).player!.x).toBeCloseTo(later.player!.x, 5);
    // 오른쪽 끝을 넘지 않는다.
    let far = state;
    for (let at = startedAt + 600; at < startedAt + 3_000; at += 300) {
      far = apply(far, { kind: "move", playerId: "p1", direction: 1 }, at).state;
      far = advanceDodge(far, at + 300);
    }
    expect(far.player!.x).toBe(DODGE_RULES.maxX);
  });

  it("부딪히면 하트와 점수가 줄고, 1.2초 동안은 다시 부딪히지 않는다", () => {
    const base = playing();
    const flyer = (id: number) => ({ id, x: 0.5, y: PLAYER_Y, speed: 0, angle: 0, variant: 0 as const, counted: false });
    const state: DodgeState = { ...base, flyers: [flyer(100), flyer(101)], lastSpawnAt: startedAt + 10_000 };
    const hit = advanceDodge(state, startedAt + 40);
    expect(hit.player).toMatchObject({ lives: 2, penalties: 150 });
    // 두 번째 전단지는 무적 시간이라 그대로 둔다.
    expect(hit.flyers.map((item) => item.id)).toEqual([101]);
  });

  it("보너스는 +300점, 하트는 3개까지 채운다", () => {
    const base = playing();
    const item = (id: number, kind: "BONUS" | "HEART") => ({ id, x: 0.5, y: PLAYER_Y, speed: 0, kind });
    const state: DodgeState = {
      ...base,
      player: { ...base.player!, lives: 2 },
      items: [item(1, "BONUS"), item(2, "HEART"), item(3, "HEART")],
      lastSpawnAt: startedAt + 10_000,
    };
    expect(advanceDodge(state, startedAt + 40).player).toMatchObject({ bonus: 300, lives: 3 });
  });

  it("하트가 다 떨어지면 끝나고, 결과 점수는 게임 중 점수와 같은 식이다", () => {
    const base = playing();
    const player = { ...base.player!, lives: 1, dodged: 4, bonus: 300, penalties: 150 };
    const flyer = { id: 9, x: 0.5, y: PLAYER_Y, speed: 0, angle: 0, variant: 0 as const, counted: false };
    const state: DodgeState = { ...base, player, flyers: [flyer], lastSpawnAt: startedAt + 10_000 };
    const ended = advanceDodge(state, startedAt + 2_000);
    expect(ended.phase).toBe("RESULT");
    // 부딪힌 그 칸(첫 칸)에서 끝난다: 0.033초 × 100 → 3점 + 4×25 + 300 − 300
    expect(ended.result).toEqual({
      name: "하윤",
      survivedMs: expect.closeTo(DODGE_RULES.stepMs, 5),
      score: dodgeScore({ ...player, lives: 0, penalties: 300 }, DODGE_RULES.stepMs),
    });
  });

  it("40초를 버티면 끝나고 결과를 12초 보여 준다", () => {
    let state = playing();
    for (let at = startedAt; at <= startedAt + DODGE_RULES.durationMs; at += 1_000) {
      // 같은 자리에서 버티게 무적으로 둔다(시간 점수만 본다).
      state = { ...state, player: state.player && { ...state.player, invincibleUntil: Infinity } };
      state = advanceDodge(state, at);
    }
    expect(state.phase).toBe("RESULT");
    expect(state.result!.survivedMs).toBe(DODGE_RULES.durationMs);
    // 시간 점수만 40초 × 50 = 2,000점(피한 전단지 점수는 더해진다).
    expect(state.result!.score).toBeGreaterThanOrEqual(2_000);
    expect(state.phaseEndsAt).toBe(startedAt + DODGE_RULES.durationMs + DODGE_RULES.resultMs);
  });

  it("같은 씨앗이면 같은 판이 나온다", () => {
    const run = () => {
      let state = playing(42);
      for (let at = startedAt; at < startedAt + 10_000; at += 200) state = advanceDodge(state, at);
      return state.flyers.map((flyer) => [flyer.id, flyer.x.toFixed(4)]);
    };
    expect(run()).toEqual(run());
    expect(run().length).toBeGreaterThan(0);
  });

  it("오래 멈췄다 돌아와도 2초까지만 계산한다", () => {
    const state = advanceDodge(playing(), startedAt + 30_000);
    expect(state.simulatedAt).toBeGreaterThan(startedAt + 27_000);
  });
});

describe("전단지 피하기 · 연결", () => {
  it("시작 전에 나가면 판을 비우고, 플레이 중에 끊기면 15초 기다렸다 취소한다", () => {
    const lobby = initialDodge(1, 3);
    const countdown = apply(lobby, { kind: "join", playerId: "p1", name: "a", ticket: lobby.ticket }).state;
    expect(apply(countdown, { kind: "leave", playerId: "p1" }).state.phase).toBe("LOBBY");

    const left = apply(playing(), { kind: "leave", playerId: "p1" }, startedAt + 1_000).state;
    expect(advanceDodge(left, startedAt + 16_000).phase).toBe("PLAYING");
    expect(advanceDodge(left, startedAt + 16_001)).toMatchObject({ phase: "LOBBY", result: null });
    // 같은 탭으로 돌아오면 이어 간다.
    const back = apply(left, { kind: "hello", playerId: "p1" }, startedAt + 5_000).state;
    expect(advanceDodge(back, startedAt + 20_000).phase).toBe("PLAYING");
  });

  it("폰에는 전단지 위치 없이 작은 요약만 보낸다", () => {
    let state = playing();
    for (let at = startedAt; at < startedAt + 20_000; at += 200) {
      state = { ...state, player: state.player && { ...state.player, invincibleUntil: Infinity } };
      state = advanceDodge(state, at);
    }
    expect(state.flyers.length).toBeGreaterThan(3);
    const view = dodgeView(state, startedAt + 20_000);
    expect(view).not.toHaveProperty("flyers");
    expect(JSON.stringify({ kind: "state", view, now: Date.now() }).length).toBeLessThan(400);
  });

  it("모양이 틀린 메시지는 버린다", () => {
    expect(parseDodgeMessage({ kind: "move", playerId: "p", direction: 2 })).toBeNull();
    expect(parseDodgeMessage({ kind: "join", playerId: "p", name: 1, ticket: "a" })).toBeNull();
    expect(parseDodgeMessage({ kind: "move", playerId: "p", direction: -1 })).toEqual({
      kind: "move",
      playerId: "p",
      direction: -1,
    });
  });
});

describe("TV별 순위", () => {
  it("높은 점수가 앞, 같으면 먼저 세운 기록이 앞, 5위까지만", () => {
    let ranking = readDodgeRanking([
      { name: "a", score: 500, at: 1 },
      { name: "b", score: 900, at: 2 },
      { name: "bad" },
    ]);
    ranking = addDodgeRecord(ranking, { name: "c", score: 500, at: 3 }).ranking;
    expect(ranking.map((record) => record.name)).toEqual(["b", "a", "c"]);
    for (let index = 0; index < 3; index++) {
      ranking = addDodgeRecord(ranking, { name: `x${index}`, score: 1_000, at: 10 + index }).ranking;
    }
    expect(ranking).toHaveLength(5);
    expect(addDodgeRecord(ranking, { name: "low", score: 1, at: 99 }).rank).toBeNull();
    expect(addDodgeRecord(ranking, { name: "top", score: 9_999, at: 99 }).rank).toBe(1);
  });
});
