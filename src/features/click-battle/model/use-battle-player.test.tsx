import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BattleClientMessage,
  BattleHostMessage,
  BattleState,
} from "@/entities/game/model/click-battle";
import type { GameChannel } from "@/shared/lib/game-channel";
import { useBattlePlayer } from "./use-battle-player";

function fakeChannel() {
  let listener: ((message: BattleHostMessage) => void) | null = null;
  const sent: BattleClientMessage[] = [];
  const channel: GameChannel<BattleHostMessage, BattleClientMessage> = {
    send: (message) => sent.push(message),
    subscribe: (next) => {
      listener = next;
      return () => {
        listener = null;
      };
    },
    close: () => {},
  };
  const host = (message: BattleHostMessage) => act(() => listener?.(message));
  return { channel, sent, host };
}

const PHONE_NOW = 1_000_000;
/** TV 시계가 폰보다 12초 빠르다. */
const SKEW = 12_000;

function playingState(playerId: string, endsAt: number): BattleState {
  return {
    round: 1,
    phase: "PLAYING",
    phaseEndsAt: endsAt,
    players: [{ id: playerId, name: "하윤", team: "A", taps: 0, lastTapAt: null }],
    scores: { A: 0, B: 0 },
    winner: null,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(PHONE_NOW);
  sessionStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useBattlePlayer", () => {
  it("TV 시계와의 차이를 재고, TV 시계로 경기가 끝나면 더 세지 않는다", () => {
    const { channel, sent, host } = fakeChannel();
    const { result } = renderHook(() => useBattlePlayer("room", { channel }));
    const me = result.current.playerId;
    const hostNow = PHONE_NOW + SKEW;
    host({ kind: "state", state: playingState(me, hostNow + 1_000), now: hostNow });
    expect(result.current.clockOffsetMs).toBe(SKEW);

    act(() => result.current.tap());
    act(() => result.current.tap());
    expect(result.current.localTaps).toBe(2);

    // TV 시계로 경기 끝을 넘겼다(폰 시계로는 아직 한참 남았다).
    act(() => vi.advanceTimersByTime(1_000));
    act(() => result.current.tap());
    expect(result.current.localTaps).toBe(2);
    expect(sent.filter((message) => message.kind === "taps")).toEqual([
      expect.objectContaining({ kind: "taps", playerId: me, count: 2 }),
    ]);
  });

  it("TV 시각을 모르면(옛 TV) 폰 시계로 경기 끝을 판단하지 않는다", () => {
    const { channel, sent, host } = fakeChannel();
    const { result } = renderHook(() => useBattlePlayer("room", { channel }));
    const me = result.current.playerId;
    // 폰 시계가 TV보다 빨라 폰 시계로는 이미 끝난 것처럼 보인다.
    host({ kind: "state", state: playingState(me, PHONE_NOW - 5_000) });
    act(() => result.current.tap());
    expect(result.current.localTaps).toBe(1);
    act(() => vi.advanceTimersByTime(200));
    expect(sent.filter((message) => message.kind === "taps")).toEqual([
      expect.objectContaining({ kind: "taps", playerId: me, count: 1 }),
    ]);
  });

  it("메시지마다 이 폰만 아는 비밀 값을 싣는다(상태에는 실리지 않는다)", () => {
    const { channel, sent } = fakeChannel();
    renderHook(() => useBattlePlayer("room", { channel }));
    const hello = sent[0] as { secret?: string; playerId: string };
    expect(hello.secret).toMatch(/^[\w-]{16,64}$/);
    expect(hello.secret).not.toBe(hello.playerId);
  });
});
