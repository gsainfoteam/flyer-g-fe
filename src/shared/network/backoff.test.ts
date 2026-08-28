import { describe, expect, it } from "vitest";
import { computeBackoffMs } from "./backoff";

describe("computeBackoffMs", () => {
  const noJitter = { random: () => 0 };

  it("실패가 없으면 기본 간격 그대로다", () => {
    expect(computeBackoffMs(60_000, 0, noJitter)).toBe(60_000);
  });

  it("실패할수록 두 배씩 늘어난다", () => {
    expect(computeBackoffMs(60_000, 1, noJitter)).toBe(60_000);
    expect(computeBackoffMs(60_000, 2, noJitter)).toBe(120_000);
    expect(computeBackoffMs(60_000, 3, noJitter)).toBe(240_000);
  });

  it("최대 간격을 넘지 않는다", () => {
    expect(
      computeBackoffMs(60_000, 10, { ...noJitter, maxMs: 300_000 }),
    ).toBe(300_000);
  });

  it("jitter는 간격을 줄이는 쪽으로만 흔든다", () => {
    const withFullJitter = computeBackoffMs(60_000, 2, {
      random: () => 1,
      jitterRatio: 0.2,
    });
    expect(withFullJitter).toBe(96_000); // 120000 - 20%
    const withoutJitter = computeBackoffMs(60_000, 2, noJitter);
    expect(withFullJitter).toBeLessThanOrEqual(withoutJitter);
  });
});
