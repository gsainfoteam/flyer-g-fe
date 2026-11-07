import { act, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MANUAL_PLAYBACK_HOLD_MS, useDisplayKeyboard } from "./use-display-keyboard";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(enabled = true) {
  const onAdvance = vi.fn();
  const onPauseChange = vi.fn();
  const hook = renderHook(({ enabled }) => useDisplayKeyboard({
    enabled, onAdvance, onPauseChange,
  }), { initialProps: { enabled } });
  return { ...hook, onAdvance, onPauseChange };
}

describe("TV 키보드 조작", () => {
  it.each(["Enter", "ArrowRight"])("%s를 길게 눌러도 한 번만 넘기고 20초 후 재개한다", (key) => {
    const { onAdvance, onPauseChange } = setup();
    fireEvent.keyDown(window, { key });
    act(() => vi.advanceTimersByTime(10_000));
    fireEvent.keyDown(window, { key, repeat: true });
    fireEvent.keyDown(window, { key }); // repeat가 없는 USB 장치
    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(onPauseChange).toHaveBeenLastCalledWith(true);
    act(() => vi.advanceTimersByTime(10_000));
    expect(onPauseChange).toHaveBeenLastCalledWith(false);
    fireEvent.keyDown(window, { key }); // 자동 재개해도 누른 채면 넘기지 않는다.
    expect(onAdvance).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(window, { key });
    fireEvent.keyDown(window, { key });
    expect(onAdvance).toHaveBeenCalledTimes(2);
  });

  it("새로 누를 때마다 대기 시간을 다시 센다", () => {
    const { onAdvance, onPauseChange } = setup();
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyUp(window, { key: "Enter" });
    act(() => vi.advanceTimersByTime(15_000));
    fireEvent.keyDown(window, { key: "ArrowRight" });
    act(() => vi.advanceTimersByTime(MANUAL_PLAYBACK_HOLD_MS - 1));
    expect(onAdvance).toHaveBeenCalledTimes(2);
    expect(onPauseChange).not.toHaveBeenCalledWith(false);
    act(() => vi.advanceTimersByTime(1));
    expect(onPauseChange).toHaveBeenLastCalledWith(false);
  });

  it("게임·고정 화면 등 비활성 상태에서는 넘기거나 대기하지 않는다", () => {
    const { rerender, onAdvance, onPauseChange } = setup(false);
    fireEvent.keyDown(window, { key: "Enter" });
    rerender({ enabled: true });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onAdvance).not.toHaveBeenCalled();
    expect(onPauseChange).not.toHaveBeenCalled();
    fireEvent.keyUp(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("입력창·버튼 조작, 조합키와 다른 키에는 개입하지 않는다", () => {
    const { onAdvance } = setup();
    for (const tag of ["input", "textarea", "select", "button"]) {
      const target = document.createElement(tag);
      document.body.append(target);
      fireEvent.keyDown(target, { key: "Enter" });
      fireEvent.keyUp(target, { key: "Enter" });
      target.remove();
    }
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
    fireEvent.keyUp(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "Enter", isComposing: true });
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("창 전환으로 keyup을 놓쳐도 다시 누를 수 있고 종료하면 정리한다", () => {
    const { unmount, onAdvance, onPauseChange } = setup();
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.blur(window);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onAdvance).toHaveBeenCalledTimes(2);
    unmount();
    act(() => vi.advanceTimersByTime(MANUAL_PLAYBACK_HOLD_MS));
    fireEvent.keyUp(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onAdvance).toHaveBeenCalledTimes(2);
    expect(onPauseChange).not.toHaveBeenCalledWith(false);
  });
});
