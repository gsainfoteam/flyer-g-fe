import { getSeoulParts, parseIsoUtc, seoulDayDiff } from "@/shared/lib/datetime";
import {
  buildCafeteriaContent,
  buildRestaurantContent,
  buildWeatherContent,
  readWebUrl,
} from "./data-content";
import type {
  CafeteriaContent,
  RestaurantContent,
  WeatherContent,
} from "./data-content";
import { previousDateKey, quizOfDay } from "./quiz";
import { ZODIAC_ANIMALS, branchRelation, dayPillarOf } from "./saju";
import type { BranchRelation, DayPillar } from "./saju";
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
  | { type: "FORTUNE"; dateKey: string; dayPillar: DayPillar; fortunes: ZodiacFortune[] }
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
  | { type: "CLICK_BATTLE" }
  | { type: "SHUFFLEBOARD" }
  | { type: "FLYER_DODGE" }
  /** 설문 링크 QR. 링크가 없으면 빠진다. */
  | { type: "SURVEY"; url: string; title: string; description: string | null };

export interface ZodiacFortune {
  animal: string;
  /** 오늘 일진과 이 띠의 관계. 운세 문구를 고르는 근거다. */
  relation: BranchRelation;
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

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other]!, copy[index]!];
  }
  return copy;
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

/**
 * 띠별 운세 문구. 오늘 일진과 띠의 관계(`saju.ts`)에 맞는 묶음에서 고른다. 합이면 좋은
 * 일, 충이면 조심할 일을 말하되 겁주지 않는다. 캠퍼스 생활에 맞춘 재미용 문구다.
 * TV 칸 한 줄에 들어가게 18자 이내로 쓴다.
 */
const FORTUNE_MESSAGES: Record<"GOOD" | "SAME" | "CLASH" | "NEUTRAL", readonly string[]> = {
  GOOD: [
    "팀플이 술술 풀리는 날",
    "도움을 청하면 기꺼이 도와줘요",
    "미뤄 둔 연락에 반가운 답이 와요",
    "새로운 사람과 금방 친해져요",
    "질문하면 생각보다 쉽게 풀려요",
    "뜻밖의 칭찬을 듣게 돼요",
    "함께 먹는 밥이 유난히 맛있어요",
    "동아리에서 좋은 인연이 생겨요",
    "발표와 면접에 운이 따라요",
    "작은 친절이 크게 돌아와요",
  ],
  SAME: [
    "익숙한 방식이 가장 잘 통해요",
    "닮은 사람에게서 힌트를 얻어요",
    "하던 일을 이어 가면 빛을 봐요",
    "고집을 조금 내려놓으면 좋아요",
    "혼자 집중하는 시간이 보람차요",
    "한 번 더 확인하면 실수가 없어요",
  ],
  CLASH: [
    "서두르지 말고 한 번 더 확인!",
    "말을 부드럽게 하면 하루가 편해요",
    "지갑 조심, 충동구매 주의",
    "계획이 바뀌어도 유연하게 넘겨요",
    "무리한 약속은 내일로 미뤄요",
    "나가기 전에 챙길 것 확인",
    "일찍 자면 내일이 가벼워요",
    "급한 결정은 하루 묵혀요",
  ],
  NEUTRAL: [
    "미뤄 둔 과제를 시작하기 좋은 날",
    "도서관 자리 운이 따르는 날",
    "계획보다 산책이 답이 되는 하루",
    "정리정돈이 행운을 불러요",
    "오후에 좋은 아이디어가 떠올라요",
    "운동하면 기분이 확 풀려요",
    "룸메이트와 이야기가 잘 통해요",
    "오늘 학식이 유난히 맛있어요",
    "조금 일찍 움직이면 여유로워요",
    "새 메뉴에 도전하기 좋은 날",
  ],
};

const MESSAGE_GROUP: Record<BranchRelation, keyof typeof FORTUNE_MESSAGES> = {
  SIX_HARMONY: "GOOD",
  THREE_HARMONY: "GOOD",
  SAME: "SAME",
  CLASH: "CLASH",
  NEUTRAL: "NEUTRAL",
};

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
      const dayPillar = dayPillarOf(dateKey);
      // 같은 날 두 띠가 같은 문구를 받지 않게, 묶음마다 섞어 두고 차례로 꺼낸다.
      const decks = Object.fromEntries(
        Object.entries(FORTUNE_MESSAGES).map(([group, messages]) => [
          group,
          shuffled(messages, random),
        ]),
      ) as Record<keyof typeof FORTUNE_MESSAGES, string[]>;
      return {
        type: "FORTUNE",
        dateKey,
        dayPillar,
        fortunes: ZODIAC_ANIMALS.map((animal, branch) => {
          const relation = branchRelation(dayPillar.branch, branch);
          return {
            animal,
            relation,
            message: decks[MESSAGE_GROUP[relation]].shift() ?? "",
            luckyColor: pick(LUCKY_COLORS, random),
          };
        }),
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
    case "SHUFFLEBOARD":
      return { type: "SHUFFLEBOARD" };
    case "FLYER_DODGE":
      return { type: "FLYER_DODGE" };
    case "SURVEY": {
      const url = readWebUrl(slot.params.url);
      if (!url) return null;
      const description = slot.params.description;
      return {
        type: "SURVEY",
        url,
        title: readLabel({ label: slot.params.title }, "설문 참여"),
        description: typeof description === "string" && description.trim() ? description.trim() : null,
      };
    }
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
