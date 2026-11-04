import { getSeoulParts } from "@/shared/lib/datetime";
import type { BlockSchedule, LineupSettings } from "./types";

const minutes = (value: string) =>
  Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const weekdays = ["월", "화", "수", "목", "금", "토", "일"];

export function isScheduleActive(schedule: BlockSchedule, now: Date): boolean {
  if (schedule.type === "ALWAYS") return true;
  if (schedule.type === "DATE_RANGE") {
    return (
      now.getTime() >= Date.parse(schedule.from) &&
      now.getTime() < Date.parse(schedule.to)
    );
  }
  const p = getSeoulParts(now);
  const day = weekdays.indexOf(p.weekday) + 1;
  const minute = p.hour24 * 60 + p.minute;
  return schedule.windows.some(({ days, start, end }) => {
    const from = minutes(start),
      to = minutes(end);
    if (from < to) return days.includes(day) && minute >= from && minute < to;
    // An overnight window belongs to the day on which it starts.
    return (
      (days.includes(day) && minute >= from) ||
      (days.includes(day === 1 ? 7 : day - 1) && minute < to)
    );
  });
}

export function isQuietAt(
  ranges: LineupSettings["quietHours"],
  now: Date,
): boolean {
  const p = getSeoulParts(now);
  const minute = p.hour24 * 60 + p.minute;
  return ranges.some(({ start, end }) => {
    const from = minutes(start),
      to = minutes(end);
    return from < to
      ? minute >= from && minute < to
      : minute >= from || minute < to;
  });
}
