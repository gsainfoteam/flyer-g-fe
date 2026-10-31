import { describe, expect, it } from "vitest";
import type { DisplayFrame } from "@/entities/poster/model/frames";
import { buildWidgetContent, seoulDateKey } from "./content";
import { previousDateKey, quizOfDay } from "./quiz";
import { placeWidgetSlots } from "./schedule";
import { clampWidgetDuration, toWidgetSlots } from "./types";
import type { WidgetSlot } from "./types";

const at = (iso: string) => new Date(iso);

function slot(partial: Partial<WidgetSlot> & Pick<WidgetSlot, "type">): WidgetSlot {
  return {
    id: `w-${partial.type}`,
    durationSeconds: 30,
    params: {},
    ...partial,
  };
}

describe("toWidgetSlots", () => {
  it("모르는 종류는 버리고 빠진 값은 기본값으로 채운다", () => {
    const slots = toWidgetSlots([
      { id: "a", type: "FORTUNE" },
      { id: "b", type: "BAMBOO" },
      { id: "c", type: "DDAY", durationSeconds: 2 },
    ]);
    expect(slots.map((item) => item.id)).toEqual(["a", "c"]);
    expect(slots[0]).toMatchObject({ durationSeconds: 30 });
    expect(slots[1]).toMatchObject({ durationSeconds: 5 });
  });

  it("머무는 시간을 안전 범위로 자른다", () => {
    expect(clampWidgetDuration("DDAY", 999)).toBe(300);
    expect(clampWidgetDuration("MEAL_PICK", Number.NaN)).toBe(10);
  });
});

describe("buildWidgetContent", () => {
  const semesterEnd = slot({
    type: "DDAY",
    params: { label: "종강", date: "2026-12-18T15:00:00.000Z" },
  });

  it("D-day는 서울 날짜로 센다", () => {
    // 서울 10월 28일 23시
    const content = buildWidgetContent(semesterEnd, at("2026-10-28T14:00:00Z"));
    expect(content).toMatchObject({ type: "DDAY", label: "종강", days: 52 });
    expect(
      buildWidgetContent(semesterEnd, at("2026-12-18T16:00:00Z")),
    ).toMatchObject({ days: 0 });
  });

  it("지난 D-day와 날짜가 없는 D-day는 보여 주지 않는다", () => {
    expect(buildWidgetContent(semesterEnd, at("2026-12-20T00:00:00Z"))).toBeNull();
    expect(buildWidgetContent(slot({ type: "DDAY" }), at("2026-10-28T00:00:00Z"))).toBeNull();
  });

  it("시험 응원은 2주 전부터 시험이 끝나는 날까지만 나온다", () => {
    const exam = slot({
      type: "EXAM_CHEER",
      params: {
        label: "기말고사",
        startsAt: "2026-12-13T15:00:00.000Z",
        endsAt: "2026-12-18T15:00:00.000Z",
      },
    });
    expect(buildWidgetContent(exam, at("2026-10-28T00:00:00Z"))).toBeNull();
    expect(buildWidgetContent(exam, at("2026-12-04T00:00:00Z"))).toMatchObject({
      phase: "before",
      days: 10,
    });
    expect(buildWidgetContent(exam, at("2026-12-15T00:00:00Z"))).toMatchObject({
      phase: "during",
      days: 2,
    });
    expect(buildWidgetContent(exam, at("2026-12-20T00:00:00Z"))).toBeNull();
  });

  it("운세는 같은 날 같은 결과, 다른 날 다른 결과다", () => {
    const fortune = slot({ type: "FORTUNE" });
    const morning = buildWidgetContent(fortune, at("2026-10-28T00:00:00Z"));
    const evening = buildWidgetContent(fortune, at("2026-10-28T12:00:00Z"));
    const tomorrow = buildWidgetContent(fortune, at("2026-10-29T00:00:00Z"));
    expect(morning).toEqual(evening);
    expect(morning).not.toEqual(tomorrow);
    expect(morning?.type === "FORTUNE" && morning.fortunes).toHaveLength(12);
  });

  it("메뉴 추천은 오후 3시를 기준으로 점심과 저녁을 나눈다", () => {
    const meal = slot({ type: "MEAL_PICK" });
    // 서울 12시, 18시
    const lunch = buildWidgetContent(meal, at("2026-10-28T03:00:00Z"));
    const dinner = buildWidgetContent(meal, at("2026-10-28T09:00:00Z"));
    expect(lunch).toMatchObject({ meal: "LUNCH" });
    expect(dinner).toMatchObject({ meal: "DINNER" });
    if (lunch?.type === "MEAL_PICK") {
      expect(new Set([lunch.menu, ...lunch.alternatives]).size).toBe(4);
    }
  });

  it("퀴즈는 날짜로 고르고 어제 문제와 정답을 함께 준다", () => {
    const content = buildWidgetContent(slot({ type: "QUIZ" }), at("2026-10-29T03:00:00Z"));
    expect(content).toMatchObject({
      type: "QUIZ",
      dateKey: "2026-10-29",
      quiz: quizOfDay("2026-10-29"),
      yesterday: quizOfDay("2026-10-28"),
    });
    expect(previousDateKey("2026-11-01")).toBe("2026-10-31");
  });

  it("날짜 키는 서울 기준이다", () => {
    expect(seoulDateKey(at("2026-10-28T15:30:00Z"))).toBe("2026-10-29");
  });
});

describe("placeWidgetSlots", () => {
  const frames: DisplayFrame[] = ["a", "b", "c", "d", "e"].map((id, focusIndex) => ({
    kind: "strip",
    key: `strip:${id}`,
    focusIndex,
  }));
  const keys = (list: { key: string }[]) => list.map((frame) => frame.key);

  it("포스터 화면 N장마다 위젯 자리를 하나만 둔다", () => {
    expect(keys(placeWidgetSlots(frames, 2))).toEqual([
      "strip:a",
      "strip:b",
      "wslot:2",
      "strip:c",
      "strip:d",
      "wslot:4",
      "strip:e",
    ]);
  });

  it("포스터가 N장보다 적으면 끝에 한 자리, 없으면 위젯 자리 하나만", () => {
    expect(keys(placeWidgetSlots(frames.slice(0, 1), 4))).toEqual(["strip:a", "wslot:end"]);
    expect(keys(placeWidgetSlots([], 4))).toEqual(["wslot:only"]);
  });

  it("위젯이 없으면(간격 0) 포스터 화면을 그대로 둔다", () => {
    expect(placeWidgetSlots(frames, 0)).toBe(frames);
  });
});
