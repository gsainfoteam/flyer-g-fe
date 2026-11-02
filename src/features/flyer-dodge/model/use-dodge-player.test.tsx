import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialDodge } from "@/entities/game/model/flyer-dodge";
import type { DodgeClientMessage, DodgeHostMessage, DodgeView } from "@/entities/game/model/flyer-dodge";
import type { GameChannel } from "@/shared/lib/game-channel";
import { useDodgePlayer } from "./use-dodge-player";

function fakeChannel() {
  let listener: ((message: DodgeHostMessage) => void) | null = null;
  const sent: DodgeClientMessage[] = [];
  const channel: GameChannel<DodgeHostMessage, DodgeClientMessage> = {
    send: (message) => sent.push(message),
    subscribe: (next) => {
      listener = next;
      return () => {
        listener = null;
      };
    },
    close: () => {},
  };
  const host = (message: DodgeHostMessage) => act(() => listener?.(message));
  return { channel, sent, host };
}

const lobbyView = (): DodgeView => {
  const state = initialDodge(1, 3);
  return { round: 1, ticket: state.ticket, phase: "LOBBY", phaseEndsAt: null, player: null, result: null, rank: null };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  sessionStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useDodgePlayer", () => {
  it("TV 시계와의 차이를 잰다", () => {
    const { channel, host } = fakeChannel();
    const { result } = renderHook(() => useDodgePlayer("tv-1", { channel }));
    host({ kind: "state", view: lobbyView(), now: Date.now() + 12_000 });
    expect(result.current.clockOffsetMs).toBe(12_000);
  });

  it("누르는 동안 방향을 되풀이해 보내고, 떼면 멈춤을 보내고, 연타는 간격을 둔다", () => {
    const { channel, sent } = fakeChannel();
    const { result } = renderHook(() => useDodgePlayer("tv-1", { channel }));
    const moves = () => sent.filter((message) => message.kind === "move");

    act(() => result.current.steer(1));
    expect(moves()).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1_000));
    // 250ms마다 되풀이(초당 4번 안팎)
    expect(moves().length).toBeGreaterThanOrEqual(4);
    expect(moves().length).toBeLessThanOrEqual(6);

    act(() => result.current.steer(0));
    act(() => vi.advanceTimersByTime(100));
    expect(moves().at(-1)).toMatchObject({ direction: 0 });
    const afterRelease = moves().length;
    act(() => vi.advanceTimersByTime(1_000));
    expect(moves()).toHaveLength(afterRelease);

    // 빠르게 번갈아 눌러도 1초에 20번을 넘지 않는다.
    const before = moves().length;
    for (let index = 0; index < 50; index++) {
      act(() => {
        result.current.steer(index % 2 === 0 ? -1 : 1);
        vi.advanceTimersByTime(20);
      });
    }
    expect(moves().length - before).toBeLessThanOrEqual(20);
  });
});
