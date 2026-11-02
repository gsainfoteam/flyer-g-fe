import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNewBuildReload } from "@/features/display/model/use-new-build-reload";
import { useGameBusy } from "@/shared/lib/game-busy";

function respondWith(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok, json: async () => body })),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useNewBuildReload", () => {
  async function runOneCheck(reload: () => void) {
    renderHook(() =>
      useNewBuildReload({ currentBuildId: "build-1", intervalMs: 1000, reload }),
    );
    await vi.advanceTimersByTimeAsync(1000);
  }

  it("배포된 빌드가 다르면 새로고침한다", async () => {
    respondWith({ buildId: "build-2" });
    const reload = vi.fn();
    await runOneCheck(reload);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("같은 빌드면 그대로 둔다", async () => {
    respondWith({ buildId: "build-1" });
    const reload = vi.fn();
    await runOneCheck(reload);
    expect(reload).not.toHaveBeenCalled();
  });

  it("확인에 실패하면 새로고침하지 않는다", async () => {
    respondWith(null, false);
    const reload = vi.fn();
    await runOneCheck(reload);
    expect(reload).not.toHaveBeenCalled();
  });

  it("게임 판이 진행 중이면 끝날 때까지 미룬다", async () => {
    respondWith({ buildId: "build-2" });
    const reload = vi.fn();
    const game = renderHook(({ active }) => useGameBusy(active), { initialProps: { active: true } });
    renderHook(() => useNewBuildReload({ currentBuildId: "build-1", intervalMs: 1000, reload }));
    await vi.advanceTimersByTimeAsync(3000);
    expect(reload).not.toHaveBeenCalled();
    game.rerender({ active: false });
    await vi.advanceTimersByTimeAsync(1000);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
