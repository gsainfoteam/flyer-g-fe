import { getSeoulParts, parseIsoUtc, seoulDayDiff } from "@/shared/lib/datetime";
import {
  buildCafeteriaContent,
  buildRestaurantContent,
  buildWeatherContent,
} from "./data-content";
import type {
  CafeteriaContent,
  RestaurantContent,
  WeatherContent,
} from "./data-content";
import { previousDateKey, quizOfDay } from "./quiz";
import type { QuizQuestion } from "./quiz";
import type { WidgetSlot } from "./types";

/**
 * 위젯이 화면에 그릴 내용. 서버 없이 슬롯 설정과 시각만으로 만든다.
 *
 * 랜덤은 서울 날짜(와 시간대)를 씨앗으로 쓴다. 같은 날에는 모든 TV가 같은 운세·메뉴를
 * 보여 주고, 화면이 다시 돌아와도 바뀌지 않는다.
 */
export type WidgetContent =
  | { type: "DDAY"; label: string; days: number; targetDate: Date }
  | {
      type: "EXAM_CHEER";
      label: string;
      phase: "before" | "during";
      /** before: 시작까지 남은 날, during: 오늘이 며칠째 */
      days: number;
      message: string;
    }
  | { type: "FORTUNE"; dateKey: string; fortunes: ZodiacFortune[] }
  | { type: "MEAL_PICK"; meal: "LUNCH" | "DINNER"; menu: string; alternatives: string[] }
  | CafeteriaContent
  | WeatherContent
  | RestaurantContent
  | {
      type: "QUIZ";
      dateKey: string;
      quiz: QuizQuestion;
      /** 어제 문제와 정답. 정답률은 서버가 모아야 해서 아직 없다. */
      yesterday: QuizQuestion;
    }
  /** 실시간 게임. 화면은 플레이어가 게임 방을 열어 그린다. */
  | { type: "CLICK_BATTLE" };

export interface ZodiacFortune {
  animal: string;
  message: string;
  luckyColor: string;
}

/** 서울 날짜 "2026-10-28" */
export function seoulDateKey(now: Date): string {
  const { year, month, day } = getSeoulParts(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 문자열 씨앗으로 0 이상 1 미만의 수열을 만든다(mulberry32). */
export function seededRandom(seed: string): () => number {
  let state = 0;
  for (let index = 0; index < seed.length; index++) {
    state = (Math.imul(state, 31) + seed.charCodeAt(index)) | 0;
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

function readDate(params: Record<string, unknown>, key: string): Date | null {
  const value = params[key];
  if (typeof value !== "string") return null;
  try {
    return parseIsoUtc(value);
  } catch {
    return null;
  }
}

function readLabel(params: Record<string, unknown>, fallback: string): string {
  const value = params.label;
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

const ZODIAC = [
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

const FORTUNE_MESSAGES = [
  "미뤄 둔 과제를 시작하기 좋은 날",
  "오랜만에 연락한 친구가 반가운 소식을 전해요",
  "도서관 자리 운이 따르는 날",
  "작은 친절이 크게 돌아와요",
  "계획보다 산책이 답이 되는 하루",
  "새로운 동아리 활동에서 인연이 생겨요",
  "오늘 먹은 학식이 유난히 맛있어요",
  "질문하면 생각보다 쉽게 풀려요",
  "일찍 잠들면 내일이 가벼워져요",
  "룸메이트와 이야기가 잘 통하는 날",
  "지갑을 조심하세요, 야식 유혹이 커요",
  "꾸준함이 빛을 보는 하루",
  "뜻밖의 칭찬을 듣게 돼요",
  "정리정돈이 행운을 불러요",
  "오후에 좋은 아이디어가 떠올라요",
  "운동을 하면 기분이 확 풀려요",
] as const;

const LUCKY_COLORS = [
  "빨강",
  "주황",
  "노랑",
  "초록",
  "파랑",
  "남색",
  "보라",
  "하양",
  "검정",
  "분홍",
] as const;

/** 메뉴 풀. 백엔드가 생기면 서버가 관리하고, 지금은 화면이 들고 있다. */
const MENUS = {
  LUNCH: [
    "김치찌개",
    "제육볶음",
    "돈까스",
    "쌀국수",
    "비빔밥",
    "마라탕",
    "순대국밥",
    "칼국수",
    "초밥",
    "햄버거",
    "부대찌개",
    "카레",
  ],
  DINNER: [
    "치킨",
    "삼겹살",
    "떡볶이",
    "피자",
    "족발",
    "짜장면",
    "닭갈비",
    "곱창",
    "감자탕",
    "샤브샤브",
    "타코",
    "닭볶음탕",
  ],
} as const;

/** 점심 추천을 보여 주는 마지막 시각(서울). 이 뒤로는 저녁을 추천한다. */
const LUNCH_UNTIL_HOUR = 15;

const EXAM_CHEERS_BEFORE = [
  "지금 한 장이 시험장에서 한 문제예요",
  "오늘의 복습이 내일의 자신감",
  "아직 늦지 않았어요, 시작이 반!",
] as const;

const EXAM_CHEERS_DURING = [
  "물 마시고, 잘 자고, 잘 보기!",
  "끝까지 힘내요, 거의 다 왔어요",
  "오늘 시험도 응원해요",
] as const;

/**
 * 슬롯과 시각으로 화면 내용을 만든다. 보여 줄 때가 아니면 null이다(D-day가 지났거나
 * 시험 기간이 아닐 때). null인 위젯은 편성에서 빠진다.
 */
export function buildWidgetContent(
  slot: WidgetSlot,
  now: Date,
): WidgetContent | null {
  const dateKey = seoulDateKey(now);

  switch (slot.type) {
    case "DDAY": {
      const target = readDate(slot.params, "date");
      if (!target) return null;
      const days = seoulDayDiff(now, target);
      if (days < 0) return null;
      return { type: "DDAY", label: readLabel(slot.params, "D-day"), days, targetDate: target };
    }
    case "EXAM_CHEER": {
      const start = readDate(slot.params, "startsAt");
      const end = readDate(slot.params, "endsAt");
      if (!start || !end) return null;
      // 시험 2주 전부터 응원한다. 너무 일찍 띄우면 무뎌진다.
      const leadDays = 14;
      const untilStart = seoulDayDiff(now, start);
      const random = seededRandom(`${slot.id}:${dateKey}`);
      const label = readLabel(slot.params, "시험 기간");
      if (untilStart > 0 && untilStart <= leadDays) {
        return {
          type: "EXAM_CHEER",
          label,
          phase: "before",
          days: untilStart,
          message: pick(EXAM_CHEERS_BEFORE, random),
        };
      }
      if (untilStart <= 0 && seoulDayDiff(now, end) >= 0) {
        return {
          type: "EXAM_CHEER",
          label,
          phase: "during",
          days: 1 - untilStart,
          message: pick(EXAM_CHEERS_DURING, random),
        };
      }
      return null;
    }
    case "FORTUNE": {
      const random = seededRandom(`fortune:${dateKey}`);
      return {
        type: "FORTUNE",
        dateKey,
        fortunes: ZODIAC.map((animal) => ({
          animal,
          message: pick(FORTUNE_MESSAGES, random),
          luckyColor: pick(LUCKY_COLORS, random),
        })),
      };
    }
    case "MEAL_PICK": {
      const meal = getSeoulParts(now).hour24 < LUNCH_UNTIL_HOUR ? "LUNCH" : "DINNER";
      const random = seededRandom(`meal:${dateKey}:${meal}`);
      const pool = [...MENUS[meal]];
      const picked: string[] = [];
      while (picked.length < 4 && pool.length > 0) {
        picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!);
      }
      return { type: "MEAL_PICK", meal, menu: picked[0]!, alternatives: picked.slice(1) };
    }
    case "CAFETERIA":
      return buildCafeteriaContent(slot.params, now);
    case "WEATHER":
      return buildWeatherContent(slot.params, now);
    case "CLICK_BATTLE":
      return { type: "CLICK_BATTLE" };
    case "QUIZ":
      return {
        type: "QUIZ",
        dateKey,
        quiz: quizOfDay(dateKey),
        yesterday: quizOfDay(previousDateKey(dateKey)),
      };
    case "RESTAURANT": {
      // 한 시간마다 다른 가게를 보여 준다. 그 안에서는 모든 TV가 같다.
      const { hour24 } = getSeoulParts(now);
      return buildRestaurantContent(
        slot.params,
        seededRandom(`restaurant:${dateKey}:${hour24}`),
      );
    }
  }
}
