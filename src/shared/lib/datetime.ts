/**
 * 날짜 규칙 (명세 6.3, 공통 품질 기준)
 * - 저장·통신은 UTC ISO 8601 문자열
 * - 입력과 표시는 Asia/Seoul
 *
 * Asia/Seoul은 1988년 이후 일광절약시간을 쓰지 않으므로 고정 +09:00으로 다룬다.
 * 이 가정이 깨지면 `SEOUL_UTC_OFFSET`만 바꾸지 말고 Intl 기반 변환으로 교체해야 한다.
 */
export const SEOUL_TIME_ZONE = "Asia/Seoul";
export const SEOUL_UTC_OFFSET = "+09:00";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export class InvalidDateError extends Error {
  readonly value: string;

  constructor(value: string) {
    super(`유효한 ISO 8601 날짜 문자열이 아닙니다: ${value}`);
    this.name = "InvalidDateError";
    this.value = value;
  }
}

/** API DTO의 ISO 8601 문자열을 Date로 바꾼다. 잘못된 값은 조용히 통과시키지 않는다. */
export function parseIsoUtc(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new InvalidDateError(value);
  return date;
}

/** Date를 API로 보낼 UTC ISO 8601 문자열로 바꾼다. */
export function toIsoUtc(date: Date): string {
  return date.toISOString();
}

export interface SeoulParts {
  year: number;
  month: number;
  day: number;
  weekday: (typeof WEEKDAYS)[number];
  hour24: number;
  hour12: number;
  minute: number;
  meridiem: "AM" | "PM";
}

/** UTC 시각을 Asia/Seoul 벽시계 구성요소로 분해한다. */
export function getSeoulParts(date: Date): SeoulParts {
  const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const hour24 = shifted.getUTCHours();
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: WEEKDAYS[shifted.getUTCDay()]!,
    hour24,
    hour12: hour24 % 12 || 12,
    minute: shifted.getUTCMinutes(),
    meridiem: hour24 >= 12 ? "PM" : "AM",
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

/** "2026. 06. 08." */
export function formatSeoulDate(date: Date): string {
  const { year, month, day } = getSeoulParts(date);
  return `${year}. ${pad(month)}. ${pad(day)}.`;
}

/** "2026. 06. 08. (월)" */
export function formatSeoulDateWithWeekday(date: Date): string {
  const { weekday } = getSeoulParts(date);
  return `${formatSeoulDate(date)} (${weekday})`;
}

/** "2026. 06. 08. 13:30" */
export function formatSeoulDateTime(date: Date): string {
  const { hour24, minute } = getSeoulParts(date);
  return `${formatSeoulDate(date)} ${pad(hour24)}:${pad(minute)}`;
}

/** "2026. 06. 08. ~ 2026. 06. 15." */
export function formatSeoulPeriod(startAt: Date, endAt: Date): string {
  return `${formatSeoulDate(startAt)} ~ ${formatSeoulDate(endAt)}`;
}

/** `<input type="date">`가 요구하는 Asia/Seoul 기준 "YYYY-MM-DD" */
export function toSeoulDateInputValue(date: Date): string {
  const { year, month, day } = getSeoulParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** `<input type="datetime-local">`가 요구하는 Asia/Seoul 기준 "YYYY-MM-DDTHH:mm" */
export function toSeoulDateTimeInputValue(date: Date): string {
  const { hour24, minute } = getSeoulParts(date);
  return `${toSeoulDateInputValue(date)}T${pad(hour24)}:${pad(minute)}`;
}

/**
 * 사용자가 Asia/Seoul 기준으로 입력한 값을 UTC Date로 바꾼다.
 * 날짜만 있으면 그날 00:00 (Asia/Seoul)로 본다.
 */
export function fromSeoulInput(value: string): Date {
  const normalized = value.includes("T") ? value : `${value}T00:00`;
  const withSeconds = normalized.length === 16 ? `${normalized}:00` : normalized;
  return parseIsoUtc(`${withSeconds}${SEOUL_UTC_OFFSET}`);
}
