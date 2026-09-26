import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DisplayErrorBoundary } from "@/features/display/ui/DisplayErrorBoundary";

let shouldThrow = true;
function Flaky() {
  if (shouldThrow) throw new Error("render failed");
  return <p>재생 중</p>;
}

beforeEach(() => {
  vi.useFakeTimers();
  // React가 잡은 오류를 콘솔에 다시 찍는다. 의도한 오류라 가린다.
  vi.spyOn(console, "error").mockImplementation(() => {});
  shouldThrow = true;
});
afterEach(() => {
  vi.useRealTimers();
});

describe("DisplayErrorBoundary", () => {
  it("오류가 나면 안전 화면을 보이고 잠시 뒤 다시 그린다", () => {
    const reload = vi.fn();
    render(
      <DisplayErrorBoundary reload={reload}>
        <Flaky />
      </DisplayErrorBoundary>,
    );
    expect(screen.getByText("잠시 후 다시 시작합니다")).toBeInTheDocument();

    shouldThrow = false;
    act(() => vi.advanceTimersByTime(30_000));

    expect(screen.getByText("재생 중")).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  it("짧은 시간에 거듭 실패하면 remount 대신 페이지를 새로 받는다", () => {
    const reload = vi.fn();
    render(
      <DisplayErrorBoundary reload={reload}>
        <Flaky />
      </DisplayErrorBoundary>,
    );

    // 첫 실패 30초, 둘째 60초 뒤 다시 그려도 계속 실패한다.
    act(() => vi.advanceTimersByTime(30_000));
    act(() => vi.advanceTimersByTime(60_000));
    expect(reload).not.toHaveBeenCalled();

    // 셋째 실패는 remount가 아니라 새로고침으로 복구한다.
    act(() => vi.advanceTimersByTime(120_000));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("오래전 실패는 세지 않는다", () => {
    const reload = vi.fn();
    let now = 0;
    render(
      <DisplayErrorBoundary reload={reload} now={() => now}>
        <Flaky />
      </DisplayErrorBoundary>,
    );

    // 실패 사이가 한 시간씩 벌어지면 매번 첫 실패처럼 30초 뒤 remount한다.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      now += 60 * 60_000;
      act(() => vi.advanceTimersByTime(30_000));
    }
    expect(reload).not.toHaveBeenCalled();
  });
});
