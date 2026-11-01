import { describe, expect, it } from "vitest";
import type { CafeteriaMeal } from "./data-content";
import { ddayChip, mealChip } from "./info-bar";
import { createWidgetPicker, inShowWindow } from "./policy";
import type { WidgetSlot } from "./types";

/** 서울 시각 → Date (2026-11-02 월) */
const seoul = (hour: number, minute = 0) => new Date(Date.UTC(2026, 10, 2, hour - 9, minute));

const meal = (type: CafeteriaMeal["type"], hours: string): CafeteriaMeal => ({
  type,
  hours,
  menus: ["밥"],
});
const TODAY = [
  meal("BREAKFAST", "08:00~09:00"),
  meal("LUNCH", "11:30~13:30"),
  meal("DINNER", "17:00~19:00"),
];

describe("mealChip", () => {
  it("다음 끼니, 운영 중이면 끝나는 시각, 오늘이 끝나면 내일 첫 끼니", () => {
    expect(mealChip(TODAY, [], seoul(7, 0))).toBe("아침 08:00–09:00");
    expect(mealChip(TODAY, [], seoul(8, 10))).toBe("아침 운영 중 · 09:00까지");
    expect(mealChip(TODAY, [], seoul(9, 0))).toBe("점심 11:30–13:30");
    expect(mealChip(TODAY, [], seoul(12, 0))).toBe("점심 운영 중 · 13:30까지");
    expect(mealChip(TODAY, [], seoul(18, 59))).toBe("저녁 운영 중 · 19:00까지");
    expect(mealChip(TODAY, TODAY, seoul(21, 40))).toBe("내일 아침 08:00");
    expect(mealChip(TODAY, [], seoul(21, 40))).toBeNull();
  });

  it("쉬는 끼니(메뉴 없음)와 시간 모르는 끼니는 건너뛴다", () => {
    const lunchOnly = [meal("LUNCH", "11:30~13:30")];
    expect(mealChip(lunchOnly, [], seoul(7, 0))).toBe("점심 11:30–13:30");
    expect(mealChip([{ type: "LUNCH", hours: null, menus: ["밥"] }], [], seoul(7, 0))).toBeNull();
  });
});

describe("ddayChip", () => {
  const slot = (id: string, type: WidgetSlot["type"], params: Record<string, unknown>): WidgetSlot => ({
    id,
    type,
    durationSeconds: 5,
    params,
  });
  const graduation = slot("d1", "DDAY", { label: "종강", date: "2026-12-18T15:00:00.000Z" });
  const festival = slot("d2", "DDAY", { label: "축제", date: "2026-11-06T15:00:00.000Z" });
  const exam = slot("e", "EXAM_CHEER", {
    label: "기말고사",
    startsAt: "2026-12-13T15:00:00.000Z",
    endsAt: "2026-12-18T15:00:00.000Z",
  });

  it("가장 가까운 D-day 하나, 시험 기간이면 시험이 먼저", () => {
    expect(ddayChip([graduation, festival], seoul(12))).toBe("축제 D-5");
    expect(ddayChip([graduation, exam], seoul(12))).toBe("종강 D-47");
    expect(ddayChip([graduation, exam], new Date("2026-12-05T03:00:00Z"))).toBe("기말고사 D-9");
    expect(ddayChip([graduation, exam], new Date("2026-12-15T03:00:00Z"))).toBe("기말고사 2일째");
    expect(ddayChip([], seoul(12))).toBeNull();
  });

  it("D-day 위젯은 7일 안으로 다가왔을 때만 크게 뜬다", () => {
    const content = (days: number) => ({ type: "DDAY" as const, label: "종강", days, targetDate: new Date() });
    expect(inShowWindow(content(8), seoul(12))).toBe(false);
    expect(inShowWindow(content(7), seoul(12))).toBe(true);
  });
});

describe("createWidgetPicker().peek", () => {
  it("다음에 고를 위젯을 보여 주되 차례는 바꾸지 않는다", () => {
    const quiz: WidgetSlot = { id: "q", type: "QUIZ", durationSeconds: 15, params: {} };
    const fortune: WidgetSlot = { id: "f", type: "FORTUNE", durationSeconds: 30, params: {} };
    const picker = createWidgetPicker();
    expect(picker.peek([quiz, fortune], seoul(12))?.slot.id).toBe("q");
    expect(picker.peek([quiz, fortune], seoul(12))?.slot.id).toBe("q");
    expect(picker.pick([quiz, fortune], seoul(12))?.slot.id).toBe("q");
    expect(picker.peek([quiz, fortune], seoul(12))?.slot.id).toBe("f");
  });
});
