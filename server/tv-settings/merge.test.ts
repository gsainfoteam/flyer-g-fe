import { describe, expect, it } from "vitest";
import { mergeTvSettings } from "./merge";

const NOW = new Date("2026-11-02T03:00:00.000Z");

describe("mergeTvSettings", () => {
  it("기기 설정은 기기별로 덮고, 다른 기기와 시간대는 그대로 둔다", () => {
    const current = {
      devices: { a: { widgets: [] }, b: { widgets: [{ type: "QUIZ" }] } },
      timeSlots: [{ id: "x" }],
    };
    const merged = mergeTvSettings(current, { devices: { a: { ratioPercent: 30, widgets: [] } } }, NOW);
    expect(merged).toEqual({
      devices: { a: { ratioPercent: 30, widgets: [] }, b: { widgets: [{ type: "QUIZ" }] } },
      timeSlots: [{ id: "x" }],
      updatedAt: NOW.toISOString(),
    });
  });

  it("시간대는 목록째 바꾸고, 빈 목록도 저장한다", () => {
    expect(mergeTvSettings({ timeSlots: [{ id: "x" }] }, { timeSlots: [] }, NOW)?.timeSlots).toEqual([]);
    expect(mergeTvSettings(null, { devices: {} }, NOW)?.timeSlots).toBeNull();
  });

  it("모양이 틀리면 거절한다", () => {
    expect(mergeTvSettings({}, "x", NOW)).toBeNull();
    expect(mergeTvSettings({}, { devices: { a: { widgets: "no" } } }, NOW)).toBeNull();
    expect(mergeTvSettings({}, { timeSlots: Array.from({ length: 51 }, () => ({})) }, NOW)).toBeNull();
    expect(mergeTvSettings({}, { timeSlots: ["x"] }, NOW)).toBeNull();
  });
});
