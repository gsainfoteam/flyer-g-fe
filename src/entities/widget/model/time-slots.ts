import type { TimeSlotRule } from "./operation";

/**
 * 지금 점유 중인 시간대와 다음 전환 시각. 전환 시각에 맞춰 timer를 걸 수 있게 돌려준다.
 * 모든 규칙이 끝났으면 `nextChangeAt`은 null이다(더 기다릴 것이 없다).
 */
export interface TimeSlotState {
  rule: TimeSlotRule | null;
  /** 지금 시간대가 끝나는 시각(ms) */
  endsAt: number | null;
  nextChangeAt: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 규칙의 날마다 [시작, 끝) 구간(ms). 끝 시각이 시작보다 이르면 다음 날로 넘긴다. */
function windowsOf(rule: TimeSlotRule): [number, number][] {
  const first = Date.parse(`${rule.dates.from}T00:00:00+09:00`);
  const last = Date.parse(`${rule.dates.to}T00:00:00+09:00`);
  const windows: [number, number][] = [];
  for (let day = first; day <= last; day += DAY_MS) {
    const date = new Date(day + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const start = Date.parse(`${date}T${rule.time.from}:00+09:00`);
    let end = Date.parse(`${date}T${rule.time.to}:00+09:00`);
    if (end <= start) end += DAY_MS;
    windows.push([start, end]);
  }
  return windows;
}

export function timeSlotAt(rules: readonly TimeSlotRule[], now: Date): TimeSlotState {
  const at = now.getTime();
  let active: { rule: TimeSlotRule; end: number } | null = null;
  let nextStart: number | null = null;
  for (const rule of rules) {
    for (const [start, end] of windowsOf(rule)) {
      if (!active && start <= at && at < end) active = { rule, end };
      if (start > at && (nextStart === null || start < nextStart)) nextStart = start;
    }
  }
  if (active) {
    return {
      rule: active.rule,
      endsAt: active.end,
      nextChangeAt: nextStart === null ? active.end : Math.min(active.end, nextStart),
    };
  }
  return { rule: null, endsAt: null, nextChangeAt: nextStart };
}
