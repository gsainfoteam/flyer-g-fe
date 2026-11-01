import { seoulDateKey } from "./content";

/**
 * 같은 도메인 함수(`/api/cafeteria`, Cloudflare Pages Functions)가 학교 게시판 식단표를
 * 읽어 주는 이번 주 학식. 백엔드 학식(flyer-g-be#25, #31)이 생기기 전까지 쓴다.
 *
 * 응답: `{ fetchedAt, places: [{ place, title, days: [{ date, meals }] }] }`
 * TV의 학식 위젯은 이 중 오늘 하루를 `buildCafeteriaContent`가 읽는 형식으로 받는다.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** 서울 날짜 "2026-11-02" → 그날 서울 자정(UTC ISO) */
const seoulMidnight = (date: string) => new Date(`${date}T00:00:00+09:00`).toISOString();

/**
 * 이번 주 식단에서 오늘 학식 위젯 데이터. 식당을 정하지 않았으면 오늘 식단이 있는 첫
 * 식당이다. 오늘 식단이 없으면(휴무, 새 주 글이 아직 없음) null.
 */
export function cafeteriaDataFor(
  week: unknown,
  place: unknown,
  now: Date,
): Record<string, unknown> | null {
  if (!isRecord(week) || !Array.isArray(week.places)) return null;
  const today = seoulDateKey(now);
  const wanted = typeof place === "string" && place.trim() ? place.trim() : null;

  for (const entry of week.places) {
    if (!isRecord(entry) || typeof entry.place !== "string") continue;
    if (wanted && entry.place !== wanted) continue;
    const day = (Array.isArray(entry.days) ? entry.days : []).find(
      (candidate) => isRecord(candidate) && candidate.date === today,
    );
    if (!isRecord(day) || !Array.isArray(day.meals) || day.meals.length === 0) continue;
    return { servedOn: seoulMidnight(today), place: entry.place, meals: day.meals };
  }
  return null;
}
