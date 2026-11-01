/**
 * 한 주 동안만 적용하는 TV 행사 편성. 한국 시각 2026-11-02–11-08, 매일 18:00–20:00.
 * 종료 시각은 포함하지 않는다. 서버 설정을 바꾸지 않아 11/8 이후 자동으로 원복된다.
 */
const FIRST_START = Date.parse("2026-11-02T18:00:00+09:00");
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = 2 * 60 * 60 * 1000;

const WINDOWS = Array.from({ length: 7 }, (_, day) => {
  const start = FIRST_START + day * DAY_MS;
  return { start, end: start + WINDOW_MS };
});

export function temporaryBattleScheduleAt(now: Date): {
  active: boolean;
  nextChangeAt: number | null;
} {
  const at = now.getTime();
  for (const window of WINDOWS) {
    if (at < window.start) return { active: false, nextChangeAt: window.start };
    if (at < window.end) return { active: true, nextChangeAt: window.end };
  }
  return { active: false, nextChangeAt: null };
}
