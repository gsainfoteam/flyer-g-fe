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
 * - 학식·메뉴 추천은 끼니 시간대에만, 날씨는 30분에 한 번까지만. 날씨는 정보줄에 늘
 *   떠 있으므로 큰 화면은 가끔이면 된다.
 */

/** D-day 위젯은 이 날 수 안으로 다가왔을 때만 크게 띄운다(그 전에는 정보줄 칩). */
export const DDAY_WIDGET_WITHIN_DAYS = 7;

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
    case "DDAY":
      // 정보줄에 늘 남은 날이 보인다. 큰 화면은 다가왔을 때만 띄운다.
      return content.days <= DDAY_WIDGET_WITHIN_DAYS;
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
  const ratio = ratioPercent / 100;
  return Math.max(
    1,
    Math.ceil((averageSeconds(widgets) * (1 - ratio)) / (ratio * rotationSeconds)),
  );
}

const averageSeconds = (widgets: readonly WidgetSlot[]) =>
  widgets.reduce((sum, slot) => sum + slot.durationSeconds, 0) / widgets.length;

/**
 * 포스터 한 바퀴가 이보다 짧으면 남는 시간을 위젯으로 채운다. 편성이 한두 장뿐일 때
 * 같은 포스터만 되풀이되지 않게 한다. 포스터가 충분하면 비율 상한만 따른다.
 */
export const MIN_CYCLE_SECONDS = 60;

/** 한 바퀴를 `MIN_CYCLE_SECONDS`까지 채우는 데 필요한 위젯 자리 수. 충분하면 0 */
export function fillSlotCount(
  posterFrames: number,
  rotationSeconds: number,
  widgets: readonly WidgetSlot[],
): number {
  if (widgets.length === 0) return 0;
  const shortfall = MIN_CYCLE_SECONDS - posterFrames * rotationSeconds;
  return shortfall > 0 ? Math.ceil(shortfall / averageSeconds(widgets)) : 0;
}

export interface WidgetPick {
  slot: WidgetSlot;
  content: WidgetContent;
}

/**
 * 위젯 자리에 올 위젯을 고른다. 켜진 위젯을 차례로 돌며, 지금 내용이 있고 시간대·간격
 * 조건을 만족하는 첫 위젯을 준다. 없으면 null(그 자리는 건너뜀).
 *
 * `avoidId`는 바로 앞 화면의 위젯이다. 위젯 자리가 붙어 있을 때 같은 위젯이 연달아
 * 나오지 않게 건너뛴다.
 */
export function createWidgetPicker() {
  let cursor = -1;
  const lastShownAt = new Map<string, number>();

  /** 지금 고를 수 있는 다음 위젯(차례·시간대·간격·바로 앞 위젯 기준) */
  const next = (slots: readonly WidgetSlot[], now: Date, avoidId?: string) => {
    for (let step = 1; step <= slots.length; step++) {
      const index = (cursor + step) % slots.length;
      const slot = slots[index]!;
      if (slot.id === avoidId) continue;
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
      return { index, pick: { slot, content } };
    }
    return null;
  };

  return {
    pick(slots: readonly WidgetSlot[], now: Date, avoidId?: string): WidgetPick | null {
      const found = next(slots, now, avoidId);
      if (!found) return null;
      cursor = found.index;
      lastShownAt.set(found.pick.slot.id, now.getTime());
      return found.pick;
    },
    /** 다음에 고를 위젯을 미리 본다. 차례와 간격 기록은 바꾸지 않는다(정보줄 "다음" 표시용). */
    peek(slots: readonly WidgetSlot[], now: Date, avoidId?: string): WidgetPick | null {
      return next(slots, now, avoidId)?.pick ?? null;
    },
  };
}
