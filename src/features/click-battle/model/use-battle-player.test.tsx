import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BattleClientMessage,
  BattleHostMessage,
  BattleState,
} from "@/entities/game/model/click-battle";
import type { GameChannel } from "@/shared/lib/game-channel";
import { nextClockOffset, useBattlePlayer } from "./use-battle-player";

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

describe("nextClockOffset", () => {
  it("전송 지연으로 작게 나온 값보다 큰 값을 지키고, TV가 시계를 크게 고치면 새로 잰다", () => {
    expect(nextClockOffset(null, 11_800)).toBe(11_800);
    expect(nextClockOffset(11_800, 11_950)).toBe(11_950);
    expect(nextClockOffset(11_950, 11_700)).toBe(11_950);
    expect(nextClockOffset(11_950, 0)).toBe(0);
  });
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
      { kind: "taps", playerId: me, count: 2 },
    ]);
  });
});
