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

    // 1초에 100번은 15번만
    const capped = applyClientMessage(
      playing(),
      { kind: "taps", playerId: "a1", count: 100 },
      start + 1_000,
    ).state;
    expect(capped.scores).toEqual({ A: BATTLE_RULES.maxTapsPerSecond, B: 0 });
    expect(capped.players[0]!.taps).toBe(BATTLE_RULES.maxTapsPerSecond);

    // 명단에 없는 사람의 연타는 무시
    const stranger = applyClientMessage(
      capped,
      { kind: "taps", playerId: "x", count: 3 },
      start + 1_200,
    ).state;
    expect(stranger.scores).toEqual(capped.scores);
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
});
