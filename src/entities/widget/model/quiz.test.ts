import { describe, expect, it } from "vitest";
import { QUIZ_POOL, previousDateKey, quizOfDay } from "./quiz";
import { QUIZ_BANK, QUIZ_CATEGORIES } from "./quiz-bank";

const DAY_MS = 24 * 60 * 60 * 1000;
const dateKeyAfter = (start: string, days: number) =>
  new Date(Date.parse(`${start}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

describe("퀴즈 문제 묶음", () => {
  it("300문제가 넘고, id와 문제가 겹치지 않는다", () => {
    expect(QUIZ_POOL.length).toBeGreaterThanOrEqual(300);
    expect(new Set(QUIZ_POOL.map((quiz) => quiz.id)).size).toBe(QUIZ_POOL.length);
    expect(new Set(QUIZ_POOL.map((quiz) => quiz.question)).size).toBe(QUIZ_POOL.length);
  });

  it("정답 번호가 묶음의 정답을 가리키고, 보기는 서로 다르다", () => {
    const answers = new Map(
      QUIZ_CATEGORIES.flatMap((category) =>
        QUIZ_BANK[category].map(([question, answer]) => [question, answer] as const),
      ),
    );
    for (const quiz of QUIZ_POOL) {
      expect(quiz.choices[quiz.answerIndex]).toBe(answers.get(quiz.question));
      expect(new Set(quiz.choices).size).toBe(4);
    }
  });

  it("숫자 보기는 작은 수부터 놓는다", () => {
    const bones = QUIZ_POOL.find((quiz) => quiz.question.startsWith("성인 사람의 뼈"))!;
    expect(bones.choices).toEqual(["106개", "156개", "206개", "256개"]);
    const zero = QUIZ_POOL.find((quiz) => quiz.question.startsWith("절대영도"))!;
    expect(zero.choices).toEqual(["-373℃", "-273℃", "-173℃", "-100℃"]);
  });

  it("정답 자리가 한쪽으로 몰리지 않는다", () => {
    const counts = [0, 0, 0, 0];
    for (const quiz of QUIZ_POOL) counts[quiz.answerIndex]! += 1;
    for (const count of counts) expect(count).toBeGreaterThan(QUIZ_POOL.length * 0.15);
  });
});

describe("quizOfDay", () => {
  it("한 바퀴를 다 돌기 전에는 같은 문제가 다시 나오지 않는다", () => {
    const ids = Array.from({ length: QUIZ_POOL.length }, (_, day) =>
      quizOfDay(dateKeyAfter("2026-11-01", day)).id,
    );
    expect(new Set(ids).size).toBe(QUIZ_POOL.length);
  });

  it("같은 날은 같은 문제, 어제와 오늘은 다른 문제", () => {
    expect(quizOfDay("2026-11-01")).toBe(quizOfDay("2026-11-01"));
    expect(quizOfDay(previousDateKey("2026-11-01")).id).not.toBe(quizOfDay("2026-11-01").id);
  });
});
