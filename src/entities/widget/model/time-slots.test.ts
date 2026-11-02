import { describe, expect, it } from "vitest";
import { TIME_SLOTS } from "./operation";
import type { TimeSlotRule } from "./operation";
import { timeSlotAt } from "./time-slots";

const active = (value: string, rules: readonly TimeSlotRule[] = TIME_SLOTS) =>
  timeSlotAt(rules, new Date(value)).rule?.id ?? null;

describe("시간대 점유", () => {
  it.each([
    ["2026-11-01T21:00:00+09:00", null],
    ["2026-11-02T19:59:59.999+09:00", null],
    ["2026-11-02T20:00:00+09:00", "2026-11-event-click-battle"],
    ["2026-11-02T21:59:59.999+09:00", "2026-11-event-click-battle"],
    ["2026-11-02T22:00:00+09:00", null],
    ["2026-11-04T21:59:59.999+09:00", "2026-11-event-click-battle"],
    // 11/5부터는 셔플보드가 이벤트 시간을 점유한다.
    ["2026-11-05T19:59:59.999+09:00", null],
    ["2026-11-05T20:00:00+09:00", "2026-11-event-shuffleboard"],
    ["2026-11-07T21:59:59.999+09:00", "2026-11-event-shuffleboard"],
    ["2026-11-07T22:00:00+09:00", null],
    ["2026-11-08T21:00:00+09:00", null],
    ["2027-11-02T21:00:00+09:00", null],
  ])("%s → %s", (date, id) => {
    expect(active(date)).toBe(id);
  });

  it("다음 전환 시각을 주고, 모두 끝나면 null", () => {
    expect(timeSlotAt(TIME_SLOTS, new Date("2026-11-02T12:00:00+09:00")).nextChangeAt).toBe(
      Date.parse("2026-11-02T20:00:00+09:00"),
    );
    expect(timeSlotAt(TIME_SLOTS, new Date("2026-11-02T21:00:00+09:00")).nextChangeAt).toBe(
      Date.parse("2026-11-02T22:00:00+09:00"),
    );
    expect(timeSlotAt(TIME_SLOTS, new Date("2026-11-08T00:00:00+09:00")).nextChangeAt).toBeNull();
  });

  it("자정을 넘는 시간대, 겹치면 먼저 적힌 규칙", () => {
    const night: TimeSlotRule = {
      id: "night",
      widget: "FORTUNE",
      dates: { from: "2026-11-02", to: "2026-11-02" },
      time: { from: "23:00", to: "01:00" },
      label: "밤",
    };
    const wide: TimeSlotRule = { ...night, id: "wide", time: { from: "00:00", to: "23:59" } };
    expect(active("2026-11-03T00:30:00+09:00", [night])).toBe("night");
    expect(active("2026-11-02T23:30:00+09:00", [night, wide])).toBe("night");
    expect(active("2026-11-02T23:30:00+09:00", [wide, night])).toBe("wide");
  });
});
