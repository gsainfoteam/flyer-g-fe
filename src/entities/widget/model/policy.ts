import { getSeoulParts } from "@/shared/lib/datetime";
import { buildWidgetContent } from "./content";
import type { WidgetContent } from "./content";
import type { MealType } from "./data-content";
import type { WidgetSlot } from "./types";

/**
 * 위젯을 언제 끼우는가 (docs: 위젯 노출 정책).
 *
 * - 포스터 화면 N장마다 위젯 **한 자리**. 그 자리에 왔을 때 지금 보여 줄 수 있는 위젯
 *   하나를 차례로 고른다. 위젯이 연달아 나오거나 몰리지 않는다.
 * - N은 기기의 위젯 비율(기본 25%)을 넘지 않게 정한다.
 * - 학식·메뉴 추천은 끼니 시간대에만, 날씨는 30분에 한 번까지만. 날씨는 상단 바에 늘
 *   떠 있으므로 큰 화면은 가끔이면 된다.
 */

/** 날씨 위젯을 다시 띄우기까지의 최소 간격 */
export const WEATHER_MIN_GAP_MS = 30 * 60 * 1000;

/** 하루 중 분(서울). [시작, 끝) */
type Window = readonly [number, number];
const at = (hour: number, minute = 0) => hour * 60 + minute;

/** 메뉴 추천: 점심·저녁 전 */
export const MEAL_PICK_WINDOWS: readonly Window[] = [
  [at(10, 30), at(13, 30)],
  [at(16, 30), at(19, 30)],
];

/** 학식: 끼니마다. 식단에 운영 시간이 없을 때 쓴다. */
export const CAFETERIA_WINDOWS: Record<MealType, Window> = {
  BREAKFAST: [at(6, 30), at(9)],
  LUNCH: [at(10, 30), at(13, 30)],
  DINNER: [at(16, 30), at(19)],
};

/** 식단에 운영 시간이 있으면 시작 이만큼 전부터 보여 준다. */
const CAFETERIA_LEAD_MINUTES = 60;

/** "07:30~09:00" → [450, 540]. 모양이 다르면 null */
export function parseHours(value: string | null): Window | null {
  const match = value?.match(/^(\d{1,2}):(\d{2})\s*[~-]\s*(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [, sh, sm, eh, em] = match.map(Number);
  const start = at(sh!, sm!);
  const end = at(eh!, em!);
  return end > start ? [start, end] : null;
}

const within = (minutes: number, [start, end]: Window) =>
  minutes >= start && minutes < end;

/** 이 내용을 지금 보여 줄 시간대인가. 시간대가 없는 위젯은 늘 그렇다. */
export function inShowWindow(content: WidgetContent, now: Date): boolean {
  const { hour24, minute } = getSeoulParts(now);
  const minutes = at(hour24, minute);
  switch (content.type) {
    case "CAFETERIA":
      // 그날 운영하는 끼니의 시간대만 본다. 주말 아침처럼 없는 끼니는 건너뛴다.
      return content.meals.some((meal) => {
        const hours = parseHours(meal.hours);
        const window: Window = hours
          ? [hours[0] - CAFETERIA_LEAD_MINUTES, hours[1]]
          : CAFETERIA_WINDOWS[meal.type];
        return within(minutes, window);
      });
    case "MEAL_PICK":
      return MEAL_PICK_WINDOWS.some((window) => within(minutes, window));
    default:
      return true;
  }
}

/**
 * 포스터 화면 몇 장마다 위젯 자리를 둘까. 위젯 한 번(평균 시간)이 비율을 넘지 않게
 * 고른다: 위젯 ÷ (포스터 N장 + 위젯) ≤ 비율.
 */
export function widgetInterval(
  widgets: readonly WidgetSlot[],
  rotationSeconds: number,
  ratioPercent: number,
): number {
  if (widgets.length === 0) return 0;
  const average =
    widgets.reduce((sum, slot) => sum + slot.durationSeconds, 0) / widgets.length;
  const ratio = ratioPercent / 100;
  return Math.max(1, Math.ceil((average * (1 - ratio)) / (ratio * rotationSeconds)));
}

export interface WidgetPick {
  slot: WidgetSlot;
  content: WidgetContent;
}

/**
 * 위젯 자리에 올 위젯을 고른다. 켜진 위젯을 차례로 돌며, 지금 내용이 있고 시간대·간격
 * 조건을 만족하는 첫 위젯을 준다. 없으면 null(그 자리는 건너뜀).
 */
export function createWidgetPicker() {
  let cursor = -1;
  const lastShownAt = new Map<string, number>();

  return {
    pick(slots: readonly WidgetSlot[], now: Date): WidgetPick | null {
      for (let step = 1; step <= slots.length; step++) {
        const index = (cursor + step) % slots.length;
        const slot = slots[index]!;
        const content = buildWidgetContent(slot, now);
        if (!content || !inShowWindow(content, now)) continue;
        const last = lastShownAt.get(slot.id);
        if (
          slot.type === "WEATHER" &&
          last !== undefined &&
          now.getTime() - last < WEATHER_MIN_GAP_MS
        ) {
          continue;
        }
        cursor = index;
        lastShownAt.set(slot.id, now.getTime());
        return { slot, content };
      }
      return null;
    },
  };
}
