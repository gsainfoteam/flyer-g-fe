import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BattleClientMessage,
  BattleHostMessage,
} from "@/entities/game/model/click-battle";
import type { GameChannel } from "@/shared/lib/game-channel";
import { useBattleHost } from "./use-battle-host";

/** 서버 중계처럼 보낸 연결 id를 붙여 주는 가짜 채널 */
function fakeChannel() {
  let listener: ((message: BattleClientMessage, from?: string) => void) | null = null;
  const channel: GameChannel<BattleClientMessage, BattleHostMessage> = {
    send: () => {},
    subscribe: (next) => {
      listener = next;
      return () => {
        listener = null;
      };
    },
    close: () => {},
  };
  const from = (connection: string, message: unknown) =>
    act(() => listener?.(message as BattleClientMessage, connection));
  return { channel, from };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useBattleHost", () => {
  it("남의 참가자 id로 보낸 메시지는 버린다", () => {
    const { channel, from } = fakeChannel();
    const { result } = renderHook(() => useBattleHost("room", { channel, now: () => 0 }));

    from("c-victim", { kind: "join", playerId: "victim", name: "하윤", team: "A" });
    // 공격자가 피해자 id로 "나간다"를 보낸다
    from("c-attacker", { kind: "leave", playerId: "victim" });
    // 같은 연결이 다른 id로 바꿔 참가하려 한다
    from("c-victim", { kind: "join", playerId: "other", name: "x", team: "B" });
    act(() => vi.advanceTimersByTime(250));

    expect(result.current.state.players.map((player) => player.id)).toEqual(["victim"]);
  });

  it("모양이 틀린 메시지는 버린다", () => {
    const { channel, from } = fakeChannel();
    const { result } = renderHook(() => useBattleHost("room", { channel, now: () => 0 }));
    from("c1", { kind: "join", playerId: "p1", name: "하윤", team: "C" });
    from("c1", { kind: "join", playerId: "p1", name: 42, team: "A" });
    act(() => vi.advanceTimersByTime(250));
    expect(result.current.state.players).toEqual([]);
  });
});
