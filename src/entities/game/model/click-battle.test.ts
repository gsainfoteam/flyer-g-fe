import { describe, expect, it } from "vitest";
import {
  BATTLE_RULES,
  advanceBattle,
  applyClientMessage,
  initialBattle,
  secondsLeft,
} from "./click-battle";
import type { BattleClientMessage, BattleState, Team } from "./click-battle";

const T0 = 1_000_000;

function apply(state: BattleState, messages: BattleClientMessage[], now = T0) {
  return messages.reduce((current, message) => applyClientMessage(current, message, now).state, state);
}

const join = (playerId: string, team: Team, name = playerId): BattleClientMessage => ({
  kind: "join",
  playerId,
  team,
  name,
});

/** 양 팀에 한 명씩 들어와 경기가 막 시작된 상태 */
function playing(): BattleState {
  const lobby = apply(initialBattle(), [join("a1", "A"), join("b1", "B")]);
  return advanceBattle(lobby, T0 + BATTLE_RULES.startCountdownMs);
}

describe("클릭 배틀", () => {
  it("양 팀에 한 명씩 모이면 카운트다운을 시작한다", () => {
    const one = apply(initialBattle(), [join("a1", "A")]);
    expect(one.phase).toBe("LOBBY");
    const two = apply(one, [join("b1", "B")]);
    expect(two).toMatchObject({
      phase: "COUNTDOWN",
      phaseEndsAt: T0 + BATTLE_RULES.startCountdownMs,
    });
    expect(secondsLeft(two, T0 + 2_500)).toBe(8);
  });

  it("팀이 차면 받지 않고, 같은 사람은 두 번 세지 않는다", () => {
    let state = initialBattle();
    for (let index = 0; index < BATTLE_RULES.maxPlayersPerTeam; index++) {
      state = apply(state, [join(`a${index}`, "A")]);
    }
    const full = applyClientMessage(state, join("late", "A"), T0);
    expect(full.reply).toEqual({ kind: "rejected", playerId: "late", reason: "FULL" });
    expect(apply(state, [join("a0", "A")]).players).toHaveLength(BATTLE_RULES.maxPlayersPerTeam);
  });

  it("이름은 자르고, 비면 팀 이름으로 부른다", () => {
    const state = apply(initialBattle(), [
      join("a1", "A", "  아주아주아주긴이름입니다  "),
      join("b1", "B", "   "),
    ]);
    expect(state.players.map((player) => player.name)).toEqual(["아주아주아주긴이름입", "B팀 참가자"]);
  });

  it("카운트다운 중 한 팀이 비면 모집으로 돌아간다", () => {
    const counting = apply(initialBattle(), [join("a1", "A"), join("b1", "B")]);
    const back = apply(counting, [{ kind: "leave", playerId: "b1" }]);
    expect(back).toMatchObject({ phase: "LOBBY", phaseEndsAt: null });
  });

  it("경기 중에는 입장을 막는다", () => {
    const result = applyClientMessage(playing(), join("late", "B"), T0 + 11_000);
    expect(result.reply).toMatchObject({ reason: "CLOSED" });
  });

  it("연타는 경기 중에만, 초당 상한까지만 센다", () => {
    const start = T0 + BATTLE_RULES.startCountdownMs;
    // 경기 전 연타는 무시
    const counting = apply(initialBattle(), [join("a1", "A"), join("b1", "B")]);
    expect(apply(counting, [{ kind: "taps", playerId: "a1", count: 5 }]).scores.A).toBe(0);

    // 1초에 100번은 (1초 + 여유 1초) × 초당 상한까지만
    const capped = applyClientMessage(
      playing(),
      { kind: "taps", playerId: "a1", count: 100 },
      start + 1_000,
    ).state;
    expect(capped.scores).toEqual({ A: BATTLE_RULES.maxTapsPerSecond * 2, B: 0 });
    expect(capped.players[0]!.taps).toBe(BATTLE_RULES.maxTapsPerSecond * 2);

    // 명단에 없는 사람의 연타는 무시
    const stranger = applyClientMessage(
      capped,
      { kind: "taps", playerId: "x", count: 3 },
      start + 1_200,
    ).state;
    expect(stranger.scores).toEqual(capped.scores);
  });

  it("정상 속도의 연타는 150ms 묶음이 몰려 와도 하나도 버리지 않는다", () => {
    const start = T0 + BATTLE_RULES.startCountdownMs;
    // 초당 13번을 2초 동안. 묶음 도착 간격이 고르지 않다(50ms, 250ms…).
    const arrivals = [150, 200, 450, 500, 750, 900, 1_050, 1_100, 1_350, 1_500, 1_650, 1_900, 2_000];
    let state = playing();
    for (const at of arrivals) {
      state = applyClientMessage(state, { kind: "taps", playerId: "a1", count: 2 }, start + at).state;
    }
    expect(state.scores.A).toBe(arrivals.length * 2);
  });

  it("시간이 끝나면 승자를 정하고, 결과 뒤에는 참가자와 점수를 비운다", () => {
    const start = T0 + BATTLE_RULES.startCountdownMs;
    const scored = applyClientMessage(
      playing(),
      { kind: "taps", playerId: "b1", count: 10 },
      start + 2_000,
    ).state;
    const result = advanceBattle(scored, start + BATTLE_RULES.matchMs);
    expect(result).toMatchObject({ phase: "RESULT", winner: "B" });

    const next = advanceBattle(result, start + BATTLE_RULES.matchMs + BATTLE_RULES.resultMs);
    expect(next).toEqual(initialBattle(2));
  });

  it("점수가 같으면 무승부다", () => {
    const start = T0 + BATTLE_RULES.startCountdownMs;
    expect(advanceBattle(playing(), start + BATTLE_RULES.matchMs).winner).toBe("DRAW");
  });

  it("끝난 직후 잠깐은 늦게 도착한 연타를 받고 승패를 다시 정한다", () => {
    const start = playing();
    const matchEnd = start.phaseEndsAt!;
    const scored = apply(start, [{ kind: "taps", playerId: "a1", count: 10 }], matchEnd - 5_000);
    const result = advanceBattle(scored, matchEnd);
    expect(result).toMatchObject({ phase: "RESULT", winner: "A" });

    // 끝나기 직전에 누른 B팀 묶음이 결과로 바뀐 뒤 도착했다.
    const late = apply(result, [{ kind: "taps", playerId: "b1", count: 12 }], matchEnd + 400);
    expect(late.scores).toEqual({ A: 10, B: 12 });
    expect(late.winner).toBe("B");

    // 여유 시간이 지나면 받지 않는다.
    const tooLate = apply(late, [{ kind: "taps", playerId: "a1", count: 5 }], matchEnd + 800);
    expect(tooLate).toBe(late);
  });

  it("두 손가락 연타(초당 20번)까지는 버리지 않는다", () => {
    const start = playing();
    const startedAt = start.phaseEndsAt! - BATTLE_RULES.matchMs;
    let state = start;
    for (let ms = 100; ms <= 10_000; ms += 100) {
      state = apply(state, [{ kind: "taps", playerId: "a1", count: 2 }], startedAt + ms);
    }
    expect(state.scores.A).toBe(200);
  });
});
