/**
 * 오늘의 일진(日辰)과 띠의 관계. 띠별 운세의 근거로 쓴다.
 *
 * 일진은 60갑자가 하루에 하나씩 끊김 없이 돈다. 1900-01-01이 갑술일이므로 그날부터
 * 지난 날 수로 바로 셀 수 있다. 계산은 한국천문연구원 일진과 맞춰 검증한 `manseryeok`
 * 라이브러리와 테스트에서 대조한다(앱에는 넣지 않는다. TV가 받을 코드를 줄인다).
 *
 * 띠와 일진의 지지(地支)가 육합·삼합이면 좋은 날, 충(沖)이면 조심할 날로 본다.
 * 같은 지지는 기운이 겹치는 날, 나머지는 무난한 날이다.
 */

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const STEMS_HANJA = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
const BRANCHES_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

/** 지지 순서(자=쥐 … 해=돼지)와 같은 순서의 띠 */
export const ZODIAC_ANIMALS = [
  "쥐",
  "소",
  "호랑이",
  "토끼",
  "용",
  "뱀",
  "말",
  "양",
  "원숭이",
  "닭",
  "개",
  "돼지",
] as const;

export interface DayPillar {
  /** "기묘" */
  name: string;
  /** "己卯" */
  hanja: string;
  /** 지지 번호. 자=0 … 해=11 */
  branch: number;
}

/** 1900-01-01(갑술일)의 60갑자 번호 */
const EPOCH_INDEX = 10;
const EPOCH_UTC = Date.UTC(1900, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;

/** 서울 날짜 "2026-11-01"의 일진 */
export function dayPillarOf(dateKey: string): DayPillar {
  const [year, month, day] = dateKey.split("-").map(Number);
  const days = Math.round((Date.UTC(year!, month! - 1, day!) - EPOCH_UTC) / DAY_MS);
  const index = (((days + EPOCH_INDEX) % 60) + 60) % 60;
  const stem = index % 10;
  const branch = index % 12;
  return {
    name: `${STEMS[stem]}${BRANCHES[branch]}`,
    hanja: `${STEMS_HANJA[stem]}${BRANCHES_HANJA[branch]}`,
    branch,
  };
}

/** 띠와 오늘 일진의 관계 */
export type BranchRelation = "SIX_HARMONY" | "THREE_HARMONY" | "SAME" | "CLASH" | "NEUTRAL";

/** 육합: 자축, 인해, 묘술, 진유, 사신, 오미 */
const SIX_HARMONY: readonly (readonly [number, number])[] = [
  [0, 1],
  [2, 11],
  [3, 10],
  [4, 9],
  [5, 8],
  [6, 7],
];

/** 삼합: 신자진, 해묘미, 인오술, 사유축 — 지지 번호를 4로 나눈 나머지가 같다 */
const sameTrine = (a: number, b: number) => a % 4 === b % 4;

export function branchRelation(day: number, animal: number): BranchRelation {
  if (day === animal) return "SAME";
  if ((day - animal + 12) % 12 === 6) return "CLASH";
  if (SIX_HARMONY.some(([a, b]) => (a === day && b === animal) || (a === animal && b === day))) {
    return "SIX_HARMONY";
  }
  if (sameTrine(day, animal)) return "THREE_HARMONY";
  return "NEUTRAL";
}

/** 관계 → 화면에 붙일 짧은 이름 */
export const RELATION_LABEL: Record<BranchRelation, string> = {
  SIX_HARMONY: "육합",
  THREE_HARMONY: "삼합",
  SAME: "같은 기운",
  CLASH: "충",
  NEUTRAL: "",
};
