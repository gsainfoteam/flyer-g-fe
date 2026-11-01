import type { PdfPage, Rect, TextItem } from "./pdf-text";

/**
 * 학교 식단표(엑셀에서 만든 주간 표 PDF)를 날짜별 끼니 메뉴로 바꾼다.
 *
 * 표 모양:
 *   Meals | 월 10/26 | 화 10/27 | …        ← 머리줄(요일 칸)
 *   Breakfast | 메뉴 | 메뉴 | …            ← 끼니 이름은 왼쪽 합친 칸
 *   Lunch (일품/한식) | …
 *   Dinner | …
 *
 * - 열: 머리줄 날짜 글자의 가운데에 가장 가까운 칸으로 메뉴를 보낸다.
 * - 끼니: 끼니 이름이 든 칸의 위아래 경계로 가른다. 경계는 그 이름의 x 위치를 지나는
 *   칠한 사각형(칸 배경·테두리)의 위아래 변이다. 식당마다 표를 그리는 방식은 다르지만
 *   (제1: 칸 배경, 제2: 얇은 테두리) 둘 다 이 규칙으로 갈린다.
 * - 메뉴 글자 정리: 알레르기 번호(`10.15`), 표시용 `*`, 빈 칸(`---`)을 뺀다.
 */

export type MealType = "BREAKFAST" | "LUNCH" | "DINNER";

export interface MenuDay {
  /** 서울 날짜 "2026-10-26" */
  date: string;
  meals: { type: MealType; hours: string; menus: string[] }[];
}

/**
 * 끼니 운영 시간. 식단표 PDF에는 시간이 없어 학교 편의시설 안내의 학생식당(제1·제2
 * 학생회관 1층) 시간을 쓴다(https://www.gist.ac.kr/en/html/sub05/050301.html).
 * 두 식당이 같다. 쉬는 날은 식단표에 그날 메뉴가 없는 것으로 가린다.
 */
export const MEAL_HOURS: Record<MealType, string> = {
  BREAKFAST: "08:00~09:00",
  LUNCH: "11:30~13:30",
  DINNER: "17:00~19:00",
};

const MEAL_LABELS: Record<string, MealType> = {
  breakfast: "BREAKFAST",
  lunch: "LUNCH",
  dinner: "DINNER",
  아침: "BREAKFAST",
  조식: "BREAKFAST",
  점심: "LUNCH",
  중식: "LUNCH",
  저녁: "DINNER",
  석식: "DINNER",
};

/** 글자 폭 어림. 한글·한자는 1em, 나머지는 0.55em */
const widthOf = (item: TextItem) =>
  [...item.text].reduce((sum, char) => sum + (char.charCodeAt(0) > 0x2e80 ? 1 : 0.55), 0) *
  item.size;
const centerOf = (item: TextItem) => item.x + widthOf(item) / 2;

/** "Mon 10/26", "10월 26일 (월)" → [월, 일] */
function headerDate(text: string): [number, number] | null {
  const slash = /(\d{1,2})\s*\/\s*(\d{1,2})/.exec(text);
  if (slash) return [Number(slash[1]), Number(slash[2])];
  const korean = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(text);
  return korean ? [Number(korean[1]), Number(korean[2])] : null;
}

/** 월·일 → 기준 시각에 가장 가까운 해의 "YYYY-MM-DD"(연말·연초 주를 바르게) */
function dateKey(month: number, day: number, now: Date): string {
  const year = now.getUTCFullYear();
  const candidates = [year - 1, year, year + 1].map((candidate) => ({
    candidate,
    distance: Math.abs(Date.UTC(candidate, month - 1, day) - now.getTime()),
  }));
  const best = candidates.sort((a, b) => a.distance - b.distance)[0]!.candidate;
  return `${best}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 메뉴 하나를 TV에 보일 글자로. 비면 null */
export function cleanMenu(text: string): string | null {
  const cleaned = text
    .replace(/\s+\d+(\.\d+)*$/, "") // 알레르기 번호 "10.15"
    .replace(/\*[A-Za-z]$/, "") // "야채샐러드*D"
    .replace(/^\*+/, "") // 일품 둘째 줄 표시
    .replace(/\s*\*\s*/g, "&") // "시리얼*우유" → "시리얼&우유"
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || /^-+$/.test(cleaned)) return null;
  return cleaned;
}

/**
 * 같은 칸·같은 줄 조각을 잇는다. 다른 글꼴로 따로 찍힌 짧은 기호("/", "*")가 앞 조각
 * 가운데에 있으면 그 자리의 빈칸에 넣는다("돈까스 소스" + "/" → "돈까스/소스").
 */
function joinLine(parts: TextItem[]): string {
  const sorted = [...parts].sort((a, b) => a.x - b.x);
  let text = "";
  let host: TextItem | null = null;
  for (const part of sorted) {
    const isMark = part.text.length <= 2 && !/[가-힣\w]/.test(part.text);
    if (isMark && host && part.x < host.x + widthOf(host) && text.includes(" ")) {
      const index = text.lastIndexOf(" ");
      text = `${text.slice(0, index)}${part.text}${text.slice(index + 1)}`;
      continue;
    }
    text = text ? `${text} ${part.text}` : part.text;
    host = part;
  }
  return text;
}

/** 이 x를 지나는 사각형들의 위아래 변 */
function edgesAt(rects: Rect[], x: number): number[] {
  return rects
    .filter((rect) => rect.x1 - 0.5 <= x && x <= rect.x2 + 0.5)
    .flatMap((rect) => [rect.y1, rect.y2]);
}

export function parseMenuPage({ items, rects }: PdfPage, now: Date): MenuDay[] {
  // 1. 머리줄: 날짜가 든 조각이 가장 많은 줄
  const dated = items.filter((item) => headerDate(item.text));
  const rows = new Map<number, TextItem[]>();
  for (const item of dated) {
    const key = Math.round(item.y);
    const row = [...rows.keys()].find((y) => Math.abs(y - key) <= 2);
    rows.set(row ?? key, [...(rows.get(row ?? key) ?? []), item]);
  }
  const header = [...rows.values()].sort((a, b) => b.length - a.length)[0];
  if (!header || header.length < 3) return [];
  const columns = header
    .map((item) => {
      const [month, day] = headerDate(item.text)!;
      return { date: dateKey(month, day, now), center: centerOf(item) };
    })
    .sort((a, b) => a.center - b.center);
  const headerY = Math.min(...header.map((item) => item.y));
  const spacing = (columns[columns.length - 1]!.center - columns[0]!.center) / (columns.length - 1);
  const left = columns[0]!.center - spacing / 2;
  const right = columns[columns.length - 1]!.center + spacing / 2;

  // 2. 끼니 구간: 왼쪽 칸의 끼니 이름 → 그 칸의 위아래 경계
  const sections = items
    .filter((item) => item.x < left && MEAL_LABELS[item.text.toLowerCase()])
    .map((label) => {
      const edges = edgesAt(rects, label.x + 1);
      const below = Math.max(...edges.filter((y) => y < label.y - 1), -Infinity);
      const above = Math.min(...edges.filter((y) => y > label.y + 1), headerY);
      return { type: MEAL_LABELS[label.text.toLowerCase()]!, bottom: below, top: above };
    })
    .filter((section) => Number.isFinite(section.bottom));

  // 3. 칸마다 메뉴 줄: (열, 줄) 묶음 → 위에서 아래로
  const lineOf = (item: TextItem) => Math.round(item.y / 3);
  // 표 전체에 걸친 안내 줄("***조식 셀프 즉석라면코너(…)***")은 줄째 뺀다. 글꼴이 섞여
  // 여러 조각으로 찍히므로 조각 하나라도 "***"이면 그 줄 전부를 뺀다.
  const noticeLines = new Set(items.filter((item) => item.text.includes("***")).map(lineOf));
  const cells = new Map<string, TextItem[]>();
  for (const item of items) {
    const center = centerOf(item);
    if (item.y >= headerY - 1 || center < left || center > right) continue;
    if (noticeLines.has(lineOf(item))) continue;
    // 여러 칸에 걸친 긴 안내 문구는 뺀다(폭 어림이 넉넉해 두 칸 넘을 때만).
    if (widthOf(item) > spacing * 2) continue;
    const column = columns.reduce((best, candidate) =>
      Math.abs(candidate.center - center) < Math.abs(best.center - center) ? candidate : best,
    );
    const section = sections.find((range) => item.y > range.bottom && item.y < range.top);
    if (!section) continue;
    const key = `${column.date}|${section.type}|${lineOf(item)}`;
    cells.set(key, [...(cells.get(key) ?? []), item]);
  }

  return columns.map(({ date }) => ({
    date,
    meals: (["BREAKFAST", "LUNCH", "DINNER"] as const)
      .map((type) => {
        const lines = [...cells.entries()]
          .filter(([key]) => key.startsWith(`${date}|${type}|`))
          .map(([, parts]) => ({ y: Math.max(...parts.map((part) => part.y)), text: joinLine(parts) }))
          .sort((a, b) => b.y - a.y);
        const menus = lines
          .map((line) => cleanMenu(line.text))
          .filter((menu): menu is string => menu !== null);
        return { type, hours: MEAL_HOURS[type], menus };
      })
      .filter((meal) => meal.menus.length > 0),
  }));
}
