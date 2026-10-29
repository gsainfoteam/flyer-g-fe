import { seededRandom } from "./content";

/**
 * 오늘의 퀴즈. TV가 문제를 보여 주고, 학생은 QR로 폰에서 답을 고른다. 정답은 다음
 * 날 TV에서 공개한다. 한 번에 모두 같은 문제를 보도록 서울 날짜로 고른다.
 *
 * 정답률·랭킹은 서버가 답을 모아야 해서 아직 없다. 지금은 화면만 있다. 문제 풀은
 * 서버가 생기면 운영자가 관리하고, 지금은 화면이 들고 있다.
 */
export interface QuizQuestion {
  id: string;
  question: string;
  choices: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
}

const QUIZ_POOL: readonly QuizQuestion[] = [
  {
    id: "q-water-boil",
    question: "해발 0m에서 물이 끓는 온도는?",
    choices: ["90℃", "100℃", "110℃", "120℃"],
    answerIndex: 1,
  },
  {
    id: "q-planet-largest",
    question: "태양계에서 가장 큰 행성은?",
    choices: ["토성", "해왕성", "목성", "천왕성"],
    answerIndex: 2,
  },
  {
    id: "q-light-speed",
    question: "빛이 1초에 가는 거리에 가장 가까운 것은?",
    choices: ["3만 km", "30만 km", "300만 km", "3,000만 km"],
    answerIndex: 1,
  },
  {
    id: "q-dna-bases",
    question: "DNA 염기가 아닌 것은?",
    choices: ["아데닌", "구아닌", "우라실", "티민"],
    answerIndex: 2,
  },
  {
    id: "q-binary",
    question: "2진수 1011은 10진수로?",
    choices: ["9", "10", "11", "13"],
    answerIndex: 2,
  },
  {
    id: "q-hangul",
    question: "훈민정음이 반포된 해는?",
    choices: ["1392년", "1446년", "1592년", "1776년"],
    answerIndex: 1,
  },
  {
    id: "q-gwangju-river",
    question: "광주를 가로질러 흐르는 강은?",
    choices: ["낙동강", "금강", "영산강", "섬진강"],
    answerIndex: 2,
  },
  {
    id: "q-periodic",
    question: "원자번호 1번 원소는?",
    choices: ["헬륨", "수소", "산소", "탄소"],
    answerIndex: 1,
  },
  {
    id: "q-pi",
    question: "원주율 π의 소수 둘째 자리까지 값은?",
    choices: ["3.12", "3.14", "3.16", "3.18"],
    answerIndex: 1,
  },
  {
    id: "q-bones",
    question: "성인 사람의 뼈는 대략 몇 개?",
    choices: ["106개", "156개", "206개", "256개"],
    answerIndex: 2,
  },
];

export function quizOfDay(dateKey: string): QuizQuestion {
  const random = seededRandom(`quiz:${dateKey}`);
  return QUIZ_POOL[Math.floor(random() * QUIZ_POOL.length)]!;
}

/** "2026-10-29" → "2026-10-28" */
export function previousDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** 보기 번호. 폰과 TV가 같은 표기를 쓴다. */
export const CHOICE_MARKS = ["①", "②", "③", "④"] as const;
