import { act, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MANUAL_PLAYBACK_HOLD_MS, PREVIOUS_PRESS_MS, useDisplayKeyboard } from "./use-display-keyboard";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
function setup(enabled = true, hasPrevious = true) {
  const onAdvance = vi.fn();
  const onPrevious = vi.fn(() => hasPrevious);
  const onPauseChange = vi.fn();
  const hook = renderHook(({ enabled }) => useDisplayKeyboard({
    enabled, onAdvance, onPrevious, onPauseChange,
  }), { initialProps: { enabled } });
  return { ...hook, onAdvance, onPrevious, onPauseChange };
}
const down = (key = "Enter", repeat = false) => fireEvent.keyDown(window, { key, repeat });
const up = (key = "Enter") => fireEvent.keyUp(window, { key });
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("TV 키보드 조작", () => {
  it("짧게 누르고 떼면 다음으로 이동하며 누르는 동안에는 자동 재생을 멈춘다", () => {
    const { result, onAdvance, onPrevious, onPauseChange } = setup();
    down();
    expect(onPauseChange).toHaveBeenLastCalledWith(true);
    expect(result.current.pressProgress).toBe(0);
    wait(PREVIOUS_PRESS_MS - 1);
    expect(onAdvance).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    up();
    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(result.current.pressProgress).toBeNull();
    wait(MANUAL_PLAYBACK_HOLD_MS - 1);
    expect(onPauseChange).not.toHaveBeenCalledWith(false);
    wait(1);
    expect(onPauseChange).toHaveBeenLastCalledWith(false);
  });

  it("0.8초 누르면 이전으로 한 번만 이동하고 손을 뗄 때 다음으로 가지 않는다", () => {
    const { result, onAdvance, onPrevious, onPauseChange } = setup();
    down();
    wait(400);
    expect(result.current.pressProgress).toBe(0.5);
    down("Enter", true);
    down(); // repeat 표시가 없는 장치
    wait(400);
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(result.current.pressProgress).toBe(1);
    wait(MANUAL_PLAYBACK_HOLD_MS);
    expect(onPauseChange).toHaveBeenLastCalledWith(false);
    down();
    up();
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("이전 이력이 없으면 머무르며 안내하고 자동 재생으로 복귀한다", () => {
    const { result, onAdvance, onPauseChange } = setup(true, false);
    down(); wait(800); up();
    expect(result.current.feedback).toBe("이전 화면이 없습니다");
    expect(onAdvance).not.toHaveBeenCalled();
    wait(MANUAL_PLAYBACK_HOLD_MS);
    expect(onPauseChange).toHaveBeenLastCalledWith(false);
  });

  it("빠른 두 번의 짧은 누름은 다음 두 장으로 이동하고 마지막 조작부터 20초를 센다", () => {
    const { onAdvance, onPrevious, onPauseChange } = setup();
    down(); up(); wait(100); down(); up();
    expect(onAdvance).toHaveBeenCalledTimes(2);
    expect(onPrevious).not.toHaveBeenCalled();
    wait(MANUAL_PLAYBACK_HOLD_MS - 1);
    expect(onPauseChange).not.toHaveBeenCalledWith(false);
    wait(1);
    expect(onPauseChange).toHaveBeenLastCalledWith(false);
  });

  it.each(["ArrowRight", "ArrowLeft"])("%s는 누르는 즉시 한 번 이동하고 반복을 무시한다", (key) => {
    const { onAdvance, onPrevious } = setup();
    const handler = key === "ArrowRight" ? onAdvance : onPrevious;
    down(key); down(key, true); down(key); wait(1000);
    expect(handler).toHaveBeenCalledTimes(1);
    up(key); down(key);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("길게 누르는 도중 다른 키를 눌러도 중복 이동하지 않는다", () => {
    const { onAdvance, onPrevious } = setup();
    down(); down("ArrowRight"); wait(800); up(); up("ArrowRight");
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("게임·행사 화면으로 바뀌면 누르던 동작을 취소한다", () => {
    const { rerender, onAdvance, onPrevious, onPauseChange } = setup();
    down(); wait(400);
    rerender({ enabled: false });
    expect(onPauseChange).toHaveBeenLastCalledWith(false);
    rerender({ enabled: true });
    down(); wait(800); up();
    expect(onAdvance).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    down(); up();
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("입력창·버튼 조작, 조합키와 한글 입력에는 개입하지 않는다", () => {
    const { onAdvance, onPrevious } = setup();
    for (const tag of ["input", "textarea", "select", "button"]) {
      const target = document.createElement(tag);
      document.body.append(target);
      fireEvent.keyDown(target, { key: "Enter" });
      fireEvent.keyUp(target, { key: "Enter" });
      target.remove();
    }
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true }); up();
    fireEvent.keyDown(window, { key: "Enter", isComposing: true }); up();
    wait(1000);
    expect(onAdvance).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("창 전환은 누르던 동작을 취소하며 타이머와 이벤트를 정리한다", () => {
    const { unmount, onAdvance, onPrevious, onPauseChange } = setup();
    down(); wait(400); fireEvent.blur(window); wait(800); up();
    expect(onAdvance).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    wait(MANUAL_PLAYBACK_HOLD_MS);
    expect(onPauseChange).toHaveBeenLastCalledWith(false);
    down();
    unmount();
    wait(MANUAL_PLAYBACK_HOLD_MS); up();
    expect(onAdvance).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });
});
