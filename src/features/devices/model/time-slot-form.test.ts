import { describe, expect, it } from "vitest";
import { TIME_SLOTS } from "@/entities/widget/model/operation";
import {
  draftFromRule,
  newTimeSlotDraft,
  timeSlotPhase,
  toTimeSlotRules,
  validateTimeSlotDrafts,
} from "./time-slot-form";

const at = (iso: string) => new Date(iso);

describe("시간대 고정 폼", () => {
  it("규칙을 폼으로 열었다가 그대로 돌려놓는다", () => {
    const rules = toTimeSlotRules(TIME_SLOTS.map(draftFromRule));
    expect(rules).toEqual(TIME_SLOTS);
  });

  it("대상 기기를 고르면 규칙에 담고, 비우면 모든 TV다", () => {
    const draft = { ...newTimeSlotDraft("2026-11-03", "s1"), label: "점심 퀴즈", widget: "QUIZ" as const };
    expect(toTimeSlotRules([draft])[0]).not.toHaveProperty("deviceIds");
    expect(toTimeSlotRules([{ ...draft, deviceIds: ["dev-1"] }])[0]?.deviceIds).toEqual(["dev-1"]);
  });

  it("설문 QR은 클릭 배틀에만 붙인다", () => {
    const base = { ...newTimeSlotDraft("2026-11-03", "s1"), label: "이벤트", surveyEnabled: true };
    expect(toTimeSlotRules([base])[0]?.survey).toMatchObject({ label: "이벤트 설문" });
    expect(toTimeSlotRules([{ ...base, widget: "QUIZ" }])[0]).not.toHaveProperty("survey");
  });

  it("빈 이름, 거꾸로 된 날짜, 같은 시각, 틀린 설문 링크를 카드별로 알린다", () => {
    const draft = newTimeSlotDraft("2026-11-03", "s1");
    expect(validateTimeSlotDrafts([draft])).toEqual({ s1: ["이름을 입력하세요"] });
    const errors = validateTimeSlotDrafts([
      {
        ...draft,
        label: "이벤트",
        dateFrom: "2026-11-05",
        timeTo: "20:00",
        surveyEnabled: true,
        surveyUrl: "notion",
      },
    ]);
    expect(errors.s1).toEqual([
      "종료 날짜는 시작 날짜와 같거나 이후로 설정하세요",
      "시작 시각과 종료 시각을 다르게 설정하세요",
      "설문 링크는 https 주소를 입력하세요",
    ]);
  });

  it("지금 기준으로 적용 중·예정·끝남을 가른다 (서울 시각)", () => {
    const [rule] = toTimeSlotRules([
      { ...newTimeSlotDraft("2026-11-02", "s1"), label: "이벤트", dateTo: "2026-11-03" },
    ]);
    // 11/2 20:30 KST
    expect(timeSlotPhase(rule!, at("2026-11-02T11:30:00Z"))).toBe("active");
    // 11/3 12:00 KST
    expect(timeSlotPhase(rule!, at("2026-11-03T03:00:00Z"))).toBe("upcoming");
    // 11/3 22:00 KST, 마지막 회차가 끝난 순간
    expect(timeSlotPhase(rule!, at("2026-11-03T13:00:00Z"))).toBe("ended");
  });
});
