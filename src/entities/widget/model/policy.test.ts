import { describe, expect, it } from "vitest";
import type { WidgetContent } from "./content";
import {
  WEATHER_MIN_GAP_MS,
  createWidgetPicker,
  inShowWindow,
  parseHours,
  widgetInterval,
} from "./policy";
import type { WidgetSlot } from "./types";

/** 서울 시각 → UTC Date (2026-10-30 기준) */
const seoul = (hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 9, 30, hour - 9, minute));

const slot = (id: string, type: WidgetSlot["type"], params: Record<string, unknown> = {}, durationSeconds = 10): WidgetSlot => ({
  id,
  type,
  durationSeconds,
  params,
});

const cafeteria = (meals: { type: "BREAKFAST" | "LUNCH" | "DINNER"; hours: string | null }[]): WidgetContent => ({
  type: "CAFETERIA",
  place: "제2학생식당",
  current: "LUNCH",
  meals: meals.map((meal) => ({ ...meal, menus: ["밥"] })),
});

describe("widgetInterval", () => {
  it("위젯 비율을 넘지 않는 포스터 장수를 고른다", () => {
    // 평균 10초 위젯, 포스터 10초, 25% → 위젯 10 / (N×10 + 10) ≤ 0.25 → N ≥ 3
    expect(widgetInterval([slot("a", "DDAY")], 10, 25)).toBe(3);
    // 평균 30초면 더 드물게
    expect(widgetInterval([slot("a", "FORTUNE", {}, 30)], 10, 25)).toBe(9);
    expect(widgetInterval([], 10, 25)).toBe(0);
  });
});

describe("inShowWindow", () => {
  it("학식은 아침까지 포함한 끼니 시간대에만 나온다", () => {
    const all = cafeteria([
      { type: "BREAKFAST", hours: null },
      { type: "LUNCH", hours: null },
      { type: "DINNER", hours: null },
    ]);
    expect(inShowWindow(all, seoul(7, 0))).toBe(true);
    expect(inShowWindow(all, seoul(9, 30))).toBe(false);
    expect(inShowWindow(all, seoul(12, 0))).toBe(true);
    expect(inShowWindow(all, seoul(15, 0))).toBe(false);
    expect(inShowWindow(all, seoul(18, 0))).toBe(true);
    expect(inShowWindow(all, seoul(21, 0))).toBe(false);
  });

  it("운영 시간이 있으면 시작 1시간 전부터, 없는 끼니는 건너뛴다", () => {
    const noBreakfast = cafeteria([{ type: "LUNCH", hours: "11:30~13:30" }]);
    expect(inShowWindow(noBreakfast, seoul(7, 30))).toBe(false);
    expect(inShowWindow(noBreakfast, seoul(10, 29))).toBe(false);
    expect(inShowWindow(noBreakfast, seoul(10, 30))).toBe(true);
    expect(inShowWindow(noBreakfast, seoul(13, 30))).toBe(false);
  });

  it("메뉴 추천은 점심·저녁 전에만, 나머지는 늘", () => {
    const mealPick: WidgetContent = { type: "MEAL_PICK", meal: "LUNCH", menu: "칼국수", alternatives: [] };
    expect(inShowWindow(mealPick, seoul(11))).toBe(true);
    expect(inShowWindow(mealPick, seoul(15))).toBe(false);
    expect(inShowWindow(mealPick, seoul(17))).toBe(true);
    const fortune: WidgetContent = { type: "FORTUNE", dateKey: "2026-10-30", fortunes: [] };
    expect(inShowWindow(fortune, seoul(3))).toBe(true);
  });

  it("운영 시간 문자열을 읽는다", () => {
    expect(parseHours("07:30~09:00")).toEqual([450, 540]);
    expect(parseHours("7:30 - 9:00")).toEqual([450, 540]);
    expect(parseHours("점심")).toBeNull();
    expect(parseHours(null)).toBeNull();
  });
});

describe("createWidgetPicker", () => {
  const weather = slot("weather", "WEATHER", {
    data: {
      fetchedAt: seoul(12).toISOString(),
      temperature: 14,
      sky: "CLEAR",
      high: 18,
      low: 9,
      precipitationChance: 0,
    },
  });
  const fortune = slot("fortune", "FORTUNE");
  const mealPick = slot("meal", "MEAL_PICK");

  it("한 번에 하나씩 차례로 고르고, 시간대 밖이면 건너뛴다", () => {
    const picker = createWidgetPicker();
    const at = seoul(15); // 메뉴 추천 시간대 밖
    const picked = [1, 2, 3].map(() => picker.pick([fortune, mealPick, weather], at)?.slot.id);
    // 날씨는 한 번 나온 뒤 30분 동안 빠진다.
    expect(picked).toEqual(["fortune", "weather", "fortune"]);
  });

  it("날씨는 30분이 지나야 다시 나온다", () => {
    const picker = createWidgetPicker();
    const start = seoul(12);
    expect(picker.pick([weather], start)?.slot.id).toBe("weather");
    expect(picker.pick([weather], new Date(start.getTime() + WEATHER_MIN_GAP_MS - 1))).toBeNull();
    expect(picker.pick([weather], new Date(start.getTime() + WEATHER_MIN_GAP_MS))?.slot.id).toBe(
      "weather",
    );
  });

  it("고를 위젯이 없으면 null", () => {
    expect(createWidgetPicker().pick([], seoul(12))).toBeNull();
    expect(createWidgetPicker().pick([mealPick], seoul(3))).toBeNull();
  });
});
