import { describe, expect, it } from "vitest";
import { hostTimeOf, nextClockOffset } from "./host-clock";

describe("nextClockOffset", () => {
  it("전송 지연으로 작게 나온 값보다 큰 값을 지키고, TV가 시계를 크게 고치면 새로 잰다", () => {
    expect(nextClockOffset(null, 11_800)).toBe(11_800);
    expect(nextClockOffset(11_800, 11_950)).toBe(11_950);
    expect(nextClockOffset(11_950, 11_700)).toBe(11_950);
    expect(nextClockOffset(11_950, 0)).toBe(0);
  });
});

describe("hostTimeOf", () => {
  it("숫자 시각만 읽는다", () => {
    expect(hostTimeOf({ now: 1_000 })).toBe(1_000);
    expect(hostTimeOf({})).toBeNull();
    expect(hostTimeOf({ now: "1000" })).toBeNull();
  });
});
