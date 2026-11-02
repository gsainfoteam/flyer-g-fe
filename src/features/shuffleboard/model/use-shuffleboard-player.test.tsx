import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialMatch } from "@/entities/game/model/shuffleboard";
import type { MatchClientMessage, MatchHostMessage } from "@/entities/game/model/shuffleboard";
import type { GameChannel } from "@/shared/lib/game-channel";
import { useShuffleboardPlayer } from "./use-shuffleboard-player";

function fakeChannel() {
  let listener: ((message: MatchHostMessage) => void) | null = null;
  const channel: GameChannel<MatchHostMessage, MatchClientMessage> = {
    send: () => {},
    subscribe: (next) => {
      listener = next;
      return () => {
        listener = null;
      };
    },
    close: () => {},
  };
  const host = (message: MatchHostMessage) => act(() => listener?.(message));
  return { channel, host };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useShuffleboardPlayer", () => {
  it("TV 시계와의 차이를 잰다(TV가 12초 빠르면 +12초)", () => {
    const { channel, host } = fakeChannel();
    const { result } = renderHook(() => useShuffleboardPlayer("room", { channel }));
    host({ kind: "state", state: initialMatch(1, "m1"), now: Date.now() + 12_000 });
    expect(result.current.clockOffsetMs).toBe(12_000);
    // 옛 TV(시각 없음)면 그대로 둔다.
    host({ kind: "state", state: initialMatch(1, "m1") });
    expect(result.current.clockOffsetMs).toBe(12_000);
  });

  it("보낸 발사는 같은 경기의 같은 턴에서만 기다리고, 다음 경기의 같은 턴은 막지 않는다", () => {
    const { channel, host } = fakeChannel();
    const { result } = renderHook(() => useShuffleboardPlayer("room", { channel }));
    const playing = (matchId: string) => ({ ...initialMatch(1, matchId), phase: "PLAYING" as const });
    host({ kind: "state", state: playing("m1") });
    act(() => result.current.shoot(0, 0.5));
    expect(result.current.waitingForTv).toBe(true);
    host({ kind: "state", state: playing("m2") });
    expect(result.current.state?.turn).toBe(playing("m1").turn);
    expect(result.current.waitingForTv).toBe(false);
  });
});
