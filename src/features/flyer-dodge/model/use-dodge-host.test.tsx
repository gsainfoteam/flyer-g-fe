import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DodgeClientMessage, DodgeHostMessage } from "@/entities/game/model/flyer-dodge";
import type { GameChannel } from "@/shared/lib/game-channel";
import { useDodgeHost } from "./use-dodge-host";

function fakeChannel() {
  let listener: ((message: DodgeClientMessage, from?: string) => void) | null = null;
  const sent: DodgeHostMessage[] = [];
  const channel: GameChannel<DodgeClientMessage, DodgeHostMessage> = {
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
    act(() => listener?.(message as DodgeClientMessage, connection));
  return { channel, sent, from };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useDodgeHost", () => {
  it("TV 시각과 작은 요약을 보내고, 판이 끝나면 이 TV 순위에 남긴다", () => {
    const { channel, sent, from } = fakeChannel();
    const { result } = renderHook(() => useDodgeHost("tv-1", { channel, seed: 5 }));
    const ticket = result.current.state.ticket;
    from("c1", { kind: "join", playerId: "p1", name: "하윤", ticket });
    // 가만히 있으면 하트를 다 잃거나 40초가 지나 끝난다.
    for (let second = 0; second < 50 && result.current.state.phase !== "RESULT"; second++) {
      act(() => vi.advanceTimersByTime(1_000));
    }
    expect(result.current.state.phase).toBe("RESULT");
    expect(result.current.ranking).toHaveLength(1);
    expect(result.current.rank).toBe(1);
    expect(JSON.parse(localStorage.getItem("flyerg:dodge-ranking:v2:tv-1")!)).toHaveLength(1);

    const last = sent.filter((message) => message.kind === "state").at(-1)!;
    expect(last.kind === "state" && last.view).toMatchObject({ phase: "RESULT", rank: 1 });
    expect(last.kind === "state" && typeof last.now).toBe("number");
    expect(JSON.stringify(last).length).toBeLessThan(400);
  });

  it("고정이 풀려 상한이 생겨도 방을 다시 열지 않고, 하던 판은 이어 간다", () => {
    const { channel, from } = fakeChannel();
    const subscribe = vi.spyOn(channel, "subscribe");
    const { result, rerender } = renderHook(
      (limits: { sessionLimitMs?: number }) => useDodgeHost("tv-1", { channel, seed: 5, ...limits }),
      { initialProps: {} },
    );
    from("c1", { kind: "join", playerId: "p1", name: "하윤", ticket: result.current.state.ticket });
    act(() => vi.advanceTimersByTime(4_000));
    rerender({ sessionLimitMs: 1_000 });
    expect(subscribe).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.state.phase).toBe("PLAYING");
  });

  it("세션 상한이 지나도 결과 화면을 끝까지 보여 주고 이 TV 순위에 남긴다", () => {
    const { channel, from } = fakeChannel();
    const { result, rerender } = renderHook(
      (limits: { sessionLimitMs?: number }) => useDodgeHost("tv-1", { channel, seed: 5, ...limits }),
      { initialProps: {} },
    );
    from("c1", { kind: "join", playerId: "p1", name: "하윤", ticket: result.current.state.ticket });
    act(() => vi.advanceTimersByTime(4_000));
    rerender({ sessionLimitMs: 1_000 });
    for (let second = 0; second < 50 && result.current.state.phase !== "RESULT"; second++) {
      act(() => vi.advanceTimersByTime(1_000));
    }
    expect(result.current.state.phase).toBe("RESULT");
    expect(result.current.ranking).toHaveLength(1);
    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.state.phase).toBe("RESULT");
  });

  it("이전 점수 규칙의 순위는 섞지 않고 그대로 둔다", () => {
    const old = JSON.stringify([{ name: "옛", score: 9_999, at: 1 }]);
    localStorage.setItem("flyerg:dodge-ranking:tv-1", old);
    const { channel } = fakeChannel();
    const { result } = renderHook(() => useDodgeHost("tv-1", { channel, seed: 5 }));
    expect(result.current.ranking).toEqual([]);
    expect(localStorage.getItem("flyerg:dodge-ranking:tv-1")).toBe(old);
  });
});
