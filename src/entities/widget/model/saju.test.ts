import { calculateFourPillars } from "manseryeok";
import { describe, expect, it } from "vitest";
import { ZODIAC_ANIMALS, branchRelation, dayPillarOf } from "./saju";

const DAY_MS = 24 * 60 * 60 * 1000;
const keyOf = (date: Date) => date.toISOString().slice(0, 10);

describe("dayPillarOf", () => {
  it("알려진 날의 일진", () => {
    expect(dayPillarOf("1900-01-01")).toMatchObject({ name: "갑술", hanja: "甲戌" });
    expect(dayPillarOf("2024-01-01")).toMatchObject({ name: "갑자", hanja: "甲子", branch: 0 });
    expect(dayPillarOf("2026-11-01")).toMatchObject({ name: "기묘", hanja: "己卯", branch: 3 });
  });

  it("2020–2035년 매일 만세력 라이브러리(한국천문연구원 일진 검증)와 같다", () => {
    const start = Date.UTC(2020, 0, 1);
    const end = Date.UTC(2036, 0, 1);
    let checked = 0;
    for (let time = start; time < end; time += DAY_MS) {
      const date = new Date(time);
      const expected = calculateFourPillars({
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: 12,
        minute: 0,
      }).toObject().day;
      expect(dayPillarOf(keyOf(date)).name).toBe(expected);
      checked++;
    }
    expect(checked).toBeGreaterThan(5800);
  });
});

describe("branchRelation", () => {
  const at = (animal: (typeof ZODIAC_ANIMALS)[number]) => ZODIAC_ANIMALS.indexOf(animal);

  it("육합·삼합·충·같은 기운을 가른다", () => {
    // 묘(토끼)일
    const day = at("토끼");
    expect(branchRelation(day, at("개"))).toBe("SIX_HARMONY"); // 묘술합
    expect(branchRelation(day, at("돼지"))).toBe("THREE_HARMONY"); // 해묘미
    expect(branchRelation(day, at("양"))).toBe("THREE_HARMONY");
    expect(branchRelation(day, at("닭"))).toBe("CLASH"); // 묘유충
    expect(branchRelation(day, at("토끼"))).toBe("SAME");
    expect(branchRelation(day, at("쥐"))).toBe("NEUTRAL");
  });

  it("여섯 쌍의 충은 서로 마주 본다", () => {
    const pairs = [
      ["쥐", "말"],
      ["소", "양"],
      ["호랑이", "원숭이"],
      ["토끼", "닭"],
      ["용", "개"],
      ["뱀", "돼지"],
    ] as const;
    for (const [a, b] of pairs) {
      expect(branchRelation(at(a), at(b))).toBe("CLASH");
      expect(branchRelation(at(b), at(a))).toBe("CLASH");
    }
  });
});

describe("띠별 운세", () => {
  it("오늘 일진과 띠의 관계로 문구를 고른다", async () => {
    const { buildWidgetContent } = await import("./content");
    // 2026-11-01 정오(서울) = 기묘일
    const content = buildWidgetContent(
      { id: "f", type: "FORTUNE", durationSeconds: 30, params: {} },
      new Date("2026-11-01T03:00:00Z"),
    );
    if (content?.type !== "FORTUNE") throw new Error("운세가 아니다");
    expect(content.dayPillar.name).toBe("기묘");
    const relationOf = (animal: string) =>
      content.fortunes.find((fortune) => fortune.animal === animal)?.relation;
    expect(relationOf("개")).toBe("SIX_HARMONY");
    expect(relationOf("닭")).toBe("CLASH");
    expect(content.fortunes).toHaveLength(12);
  });
});

describe("띠별 운세 문구", () => {
  it("1년 내내 같은 날 두 띠가 같은 문구를 받지 않는다", async () => {
    const { buildWidgetContent } = await import("./content");
    for (let day = 0; day < 365; day++) {
      const content = buildWidgetContent(
        { id: "f", type: "FORTUNE", durationSeconds: 30, params: {} },
        new Date(Date.UTC(2026, 0, 1, 3) + day * DAY_MS),
      );
      if (content?.type !== "FORTUNE") throw new Error("운세가 아니다");
      const messages = content.fortunes.map((fortune) => fortune.message);
      expect(new Set(messages).size).toBe(12);
      expect(messages.every((message) => message.length > 0 && message.length <= 18)).toBe(true);
    }
  });
});
