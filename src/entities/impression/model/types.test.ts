import { describe, expect, it } from "vitest";
import { countedWindowOf, dailyImpressionAverage } from "./types";

describe("하루 평균 노출", () => {
  const until = new Date("2026-09-30T03:00:00.000Z");
  const window = { from: new Date("2025-09-30T15:00:00.000Z"), until };
  const daysAgo = (days: number) =>
    new Date(until.getTime() - days * 24 * 60 * 60 * 1000);

  it("게시 시작부터 마지막으로 모은 시각까지로 나눈다", () => {
    expect(dailyImpressionAverage(1200, daysAgo(4), window)).toBe(300);
  });

  it("조회 시작보다 먼저 걸린 포스터는 조회 시작부터 센다", () => {
    const shortWindow = { from: daysAgo(2), until };
    expect(dailyImpressionAverage(600, daysAgo(10), shortWindow)).toBe(300);
  });

  it("센 기간이 하루가 안 되면 평균을 내지 않는다", () => {
    expect(dailyImpressionAverage(80, daysAgo(0.5), window)).toBeNull();
  });

  it("센 기간은 아직 모으지 않은 기록을 빼고 끊는다", () => {
    const aggregatedAt = new Date("2026-09-30T02:50:00.000Z");
    expect(
      countedWindowOf(
        { from: "2026-09-24", to: "2026-09-30", aggregatedAt, items: [] },
        until,
      ),
    ).toEqual({
      from: new Date("2026-09-23T15:00:00.000Z"),
      until: aggregatedAt,
    });
    expect(
      countedWindowOf(
        { from: "2026-09-24", to: "2026-09-30", aggregatedAt: null, items: [] },
        until,
      ).until,
    ).toBe(until);
  });
});
