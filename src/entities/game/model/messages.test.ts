import { describe, expect, it } from "vitest";
import { initialBattle, applyClientMessage, normalizeName } from "./click-battle";
import { parseClientMessage } from "./messages";
import { hasBlockedWord, stripInvisible } from "./name-filter";

describe("parseClientMessage", () => {
  it("모양이 맞는 메시지만 읽는다", () => {
    expect(parseClientMessage({ kind: "join", playerId: "p", name: "하윤", team: "A" })).toEqual({
      kind: "join",
      playerId: "p",
      name: "하윤",
      team: "A",
    });
    expect(parseClientMessage({ kind: "taps", playerId: "p", count: 5 })).toEqual({
      kind: "taps",
      playerId: "p",
      count: 5,
    });
  });

  it("없는 팀, 이상한 수, 빈 id, 모르는 종류는 버린다", () => {
    expect(parseClientMessage({ kind: "join", playerId: "p", name: "x", team: "C" })).toBeNull();
    expect(parseClientMessage({ kind: "taps", playerId: "p", count: Number.NaN })).toBeNull();
    expect(parseClientMessage({ kind: "taps", playerId: "p", count: -3 })).toBeNull();
    expect(parseClientMessage({ kind: "taps", playerId: "p", count: 1.5 })).toBeNull();
    expect(parseClientMessage({ kind: "hello", playerId: "" })).toBeNull();
    expect(parseClientMessage({ kind: "hello", playerId: "x".repeat(65) })).toBeNull();
    expect(parseClientMessage({ kind: "reset", playerId: "p" })).toBeNull();
    expect(parseClientMessage("join")).toBeNull();
    expect(parseClientMessage(null)).toBeNull();
  });

  it("한 번에 보내는 연타 수를 자른다", () => {
    expect(parseClientMessage({ kind: "taps", playerId: "p", count: 1e9 })).toMatchObject({
      count: 1_000,
    });
  });
});

describe("이름 거르기", () => {
  it("공용 화면에 띄우면 안 되는 말은 팀 이름으로 바꾼다", () => {
    expect(normalizeName("씨 발", "A")).toBe("A팀 참가자");
    expect(normalizeName("ㅅ.ㅂ", "B")).toBe("B팀 참가자");
    expect(normalizeName("FuCk", "A")).toBe("A팀 참가자");
    expect(hasBlockedWord("3층 하윤")).toBe(false);
  });

  it("안 보이는 글자와 줄바꿈을 지우고 공백을 줄인다", () => {
    expect(stripInvisible("하​윤‮")).toBe("하윤");
    expect(normalizeName("  3층\n\n  하윤  ", "A")).toBe("3층 하윤");
    expect(normalizeName("​​", "B")).toBe("B팀 참가자");
  });

  it("엔진은 걸러진 이름으로 참가시킨다", () => {
    const state = applyClientMessage(
      initialBattle(),
      { kind: "join", playerId: "p", name: "병신", team: "A" },
      0,
    ).state;
    expect(state.players[0]!.name).toBe("A팀 참가자");
  });
});
