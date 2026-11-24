import { act, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { StageFrame } from "./StageFrame";

afterEach(() => vi.useRealTimers());

it.each([
  ["2026-12-01", false, true],
  ["2027-01-01", true, true],
  ["2027-02-01", true, false],
  ["2027-12-01", false, true],
])("서울 자정에 눈 장식을 갱신한다 (%s)", (date, before, after) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.parse(date + "T00:00:00+09:00") - 1));
  const { container } = render(<StageFrame bar={null}>{null}</StageFrame>);
  const snowVisible = () => container.querySelector(".stage-snow") !== null;
  expect(snowVisible()).toBe(before);
  act(() => vi.advanceTimersByTime(1));
  expect(snowVisible()).toBe(after);
});
