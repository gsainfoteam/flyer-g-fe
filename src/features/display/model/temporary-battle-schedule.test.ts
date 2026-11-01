import { describe, expect, it } from "vitest";
import { temporaryBattleScheduleAt } from "./temporary-battle-schedule";

const at = (value: string) => temporaryBattleScheduleAt(new Date(value));

describe("한 주 한정 클릭 배틀 시간표", () => {
  it.each([
    ["2026-11-01T19:00:00+09:00", false],
    ["2026-11-02T17:59:59.999+09:00", false],
    ["2026-11-02T18:00:00+09:00", true],
    ["2026-11-02T19:59:59.999+09:00", true],
    ["2026-11-02T20:00:00+09:00", false],
    ["2026-11-08T19:59:59.999+09:00", true],
    ["2026-11-08T20:00:00+09:00", false],
    ["2026-11-09T19:00:00+09:00", false],
    ["2027-11-02T19:00:00+09:00", false],
  ])("%s 에 활성 상태는 %s", (date, active) => {
    expect(at(date).active).toBe(active);
  });

  it("월요일부터 일요일까지 매일 적용하고 UTC로 받아도 한국 시각 기준이다", () => {
    for (const day of [2, 3, 4, 5, 6, 7, 8]) {
      expect(at(`2026-11-0${day}T09:00:00Z`).active).toBe(true);
      expect(at(`2026-11-0${day}T11:00:00Z`).active).toBe(false);
    }
  });

  it("18시·20시·다음 날 18시 경계를 반환하고 마지막 종료 뒤에는 경계가 없다", () => {
    expect(at("2026-11-02T17:00:00+09:00").nextChangeAt).toBe(Date.parse("2026-11-02T18:00:00+09:00"));
    expect(at("2026-11-02T19:00:00+09:00").nextChangeAt).toBe(Date.parse("2026-11-02T20:00:00+09:00"));
    expect(at("2026-11-02T20:00:00+09:00").nextChangeAt).toBe(Date.parse("2026-11-03T18:00:00+09:00"));
    expect(at("2026-11-08T20:00:00+09:00").nextChangeAt).toBeNull();
  });
});
