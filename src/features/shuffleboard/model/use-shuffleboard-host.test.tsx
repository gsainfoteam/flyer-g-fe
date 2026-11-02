import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchClientMessage, MatchHostMessage } from "@/entities/game/model/shuffleboard";
import type { GameChannel } from "@/shared/lib/game-channel";
import { useShuffleboardHost } from "./use-shuffleboard-host";

function fakeChannel() {
  let listener: ((message: MatchClientMessage, from?: string) => void) | null = null;
  const sent: MatchHostMessage[] = [];
  const channel: GameChannel<MatchClientMessage, MatchHostMessage> = {
    send: (message) => sent.push(message),
    subscribe: (next) => {
      listener = next;
      return () => {
        listener = null;
      };
    },
    close: () => {},
  };
  const from = (connection: string, message: unknown) =>
    act(() => listener?.(message as MatchClientMessage, connection));
  return { channel, sent, from };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  sessionStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useShuffleboardHost", () => {
  it("상태에 TV 시각을 실어 보낸다", () => {
    const { channel, sent } = fakeChannel();
    renderHook(() => useShuffleboardHost("room", { channel }));
    act(() => vi.advanceTimersByTime(250));
    const state = sent.find((message) => message.kind === "state");
    expect(state && "now" in state ? state.now : null).toBe(Date.now() - 50);
  });

  it("고정이 풀려 상한이 생겨도 방을 다시 열지 않고, 하던 경기는 이어 간다", () => {
    const { channel, from } = fakeChannel();
    const subscribe = vi.spyOn(channel, "subscribe");
    const { result, rerender } = renderHook(
      (limits: { sessionLimitMs?: number }) => useShuffleboardHost("room", { channel, ...limits }),
      { initialProps: {} },
    );
    from("c1", { kind: "join", playerId: "p1", seat: "A" });
    from("c2", { kind: "join", playerId: "p2", seat: "B" });
    act(() => vi.advanceTimersByTime(3_400));
    expect(result.current.state.phase).toBe("PLAYING");

    // 시간대가 끝났다. 세션은 상한을 넘었지만 경기 중이라 끊지 않는다.
    rerender({ sessionLimitMs: 1_000 });
    expect(subscribe).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.state.phase).toBe("PLAYING");
    expect(result.current.state.seats.A?.playerId).toBe("p1");
  });

  it("세션 상한이 지나도 결과 화면은 끝까지 보여 준다", () => {
    const { channel, from } = fakeChannel();
    const { result, rerender } = renderHook(
      (limits: { sessionLimitMs?: number }) => useShuffleboardHost("room", { channel, ...limits }),
      { initialProps: {} },
    );
    from("c1", { kind: "join", playerId: "p1", seat: "A" });
    from("c2", { kind: "join", playerId: "p2", seat: "B" });
    act(() => vi.advanceTimersByTime(3_400));
    expect(result.current.state.phase).toBe("PLAYING");
    rerender({ sessionLimitMs: 1_000 });
    // 아무도 던지지 않으면 턴마다 시간이 다 돼 넘어가고 결국 경기가 끝난다.
    for (let second = 0; second < 200 && result.current.state.phase === "PLAYING"; second++) {
      act(() => vi.advanceTimersByTime(1_000));
    }
    expect(result.current.state.phase).toBe("FINISHED");
    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.state.phase).toBe("FINISHED");
  });
});
