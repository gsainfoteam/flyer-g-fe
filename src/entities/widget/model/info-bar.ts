import { getSeoulParts } from "@/shared/lib/datetime";
import { buildWidgetContent } from "./content";
import type { CafeteriaMeal, MealType } from "./data-content";
import { parseHours } from "./policy";
import type { WidgetSlot } from "./types";

/**
 * TV 아래 정보줄의 칩 문구. 칩은 상황에 맞을 때만 나온다. 늘 다섯 개씩 떠 있으면
 * 아무것도 눈에 들어오지 않는다.
 */

const MEAL_NAMES: Record<MealType, string> = {
  BREAKFAST: "아침",
  LUNCH: "점심",
  DINNER: "저녁",
};

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const ORDER: Record<MealType, number> = { BREAKFAST: 0, LUNCH: 1, DINNER: 2 };

/** 운영 시간이 있는 끼니를 이른 순으로 */
function timedMeals(meals: readonly CafeteriaMeal[]) {
  return meals
    .flatMap((meal) => {
      const hours = parseHours(meal.hours);
      return hours ? [{ type: meal.type, start: hours[0], end: hours[1] }] : [];
    })
    .sort((a, b) => a.start - b.start || ORDER[a.type] - ORDER[b.type]);
}

/** "제2학생식당" → "2학". 학생들이 부르는 이름이다. 모르는 이름은 그대로 쓴다. */
export function shortPlace(place: string | null | undefined): string | null {
  const trimmed = place?.trim();
  if (!trimmed) return null;
  const student = /^제?\s*(\d)\s*학생\s*식당$/.exec(trimmed);
  return student ? `${student[1]}학` : trimmed;
}

/** 어느 식당의 하루 끼니. 식당 이름은 칩 앞에 붙여 1학·2학을 가른다. */
export interface PlaceMeals {
  place: string | null;
  meals: readonly CafeteriaMeal[];
}

/**
 * 식사 칩. 지금 먹을 수 있으면 "지금 2학 점심 · 13:30까지", 아니면 오늘 다음 끼니
 * "2학 점심 11:30–13:30", 오늘 끼니가 끝났으면 "내일 2학 아침 08:00". 알 수 없으면 null.
 */
export function mealChip(today: PlaceMeals, tomorrow: PlaceMeals, now: Date): string | null {
  const { hour24, minute } = getSeoulParts(now);
  const minutes = hour24 * 60 + minute;
  const label = (place: string | null, type: MealType) =>
    [shortPlace(place), MEAL_NAMES[type]].filter(Boolean).join(" ");
  for (const meal of timedMeals(today.meals)) {
    if (minutes >= meal.end) continue;
    const name = label(today.place, meal.type);
    return minutes >= meal.start
      ? `지금 ${name} · ${clock(meal.end)}까지`
      : `${name} ${clock(meal.start)}–${clock(meal.end)}`;
  }
  const first = timedMeals(tomorrow.meals)[0];
  return first ? `내일 ${label(tomorrow.place, first.type)} ${clock(first.start)}` : null;
}

/**
 * D-day 칩. 시험 기간(전 2주–끝)이면 그것을, 아니면 가장 가까운 D-day 하나.
 * 켜진 D-day·시험 응원 위젯 설정에서 읽는다. 없으면 null.
 */
export function ddayChip(slots: readonly WidgetSlot[], now: Date): string | null {
  for (const slot of slots) {
    if (slot.type !== "EXAM_CHEER") continue;
    const content = buildWidgetContent(slot, now);
    if (content?.type !== "EXAM_CHEER") continue;
    return content.phase === "before"
      ? `${content.label} D-${content.days}`
      : `${content.label} ${content.days}일째`;
  }
  const nearest = slots
    .filter((slot) => slot.type === "DDAY")
    .map((slot) => buildWidgetContent(slot, now))
    .flatMap((content) => (content?.type === "DDAY" ? [content] : []))
    .sort((a, b) => a.days - b.days)[0];
  if (!nearest) return null;
  return nearest.days === 0 ? `${nearest.label} D-day` : `${nearest.label} D-${nearest.days}`;
}
