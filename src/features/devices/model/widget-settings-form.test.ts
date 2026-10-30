import { describe, expect, it } from "vitest";
import {
  defaultWidgetSettings,
  settingsToSlotDtos,
  toWidgetSettings,
} from "@/entities/widget/model/settings";
import {
  draftFromSetting,
  validateRatioPercent,
  toWidgetSettingDtos,
  validateWidgetDrafts,
} from "./widget-settings-form";

describe("toWidgetSettings", () => {
  it("빠진 종류는 기본값으로 채우고 범위를 넘는 값은 자른다", () => {
    const settings = toWidgetSettings([
      { type: "FORTUNE", enabled: false, durationSeconds: 999 },
      { type: "BAMBOO", enabled: true },
    ]);
    expect(settings).toHaveLength(9);
    expect(settings.find((item) => item.type === "FORTUNE")).toMatchObject({
      enabled: false,
      durationSeconds: 300,
    });
    expect(settings.find((item) => item.type === "WEATHER")?.enabled).toBe(true);
  });

  it("켜진 설정만 편성 슬롯이 된다", () => {
    const settings = defaultWidgetSettings().map((item) => ({
      ...item,
      enabled: item.type === "DDAY",
    }));
    expect(settingsToSlotDtos(settings).map((slot) => slot.id)).toEqual(["widget-dday"]);
  });
});

describe("위젯 설정 폼", () => {
  const settings = defaultWidgetSettings();
  const drafts = settings.map(draftFromSetting);

  it("날짜는 서울 기준으로 주고받는다", () => {
    const exam = drafts.find((draft) => draft.type === "EXAM_CHEER")!;
    expect(exam).toMatchObject({ startDate: "2026-12-14", endDate: "2026-12-19" });

    const dtos = toWidgetSettingDtos(drafts, settings);
    expect(dtos.find((dto) => dto.type === "EXAM_CHEER")?.params).toEqual(
      settings.find((item) => item.type === "EXAM_CHEER")!.params,
    );
  });

  it("켜진 위젯만 검사한다", () => {
    const broken = drafts.map((draft) =>
      draft.type === "DDAY"
        ? { ...draft, durationSeconds: "2", label: " ", startDate: "" }
        : draft.type === "FORTUNE"
          ? { ...draft, enabled: false, everyFrames: "x" }
          : draft,
    );
    const errors = validateWidgetDrafts(broken);
    expect(Object.keys(errors)).toEqual(["DDAY"]);
    expect(errors.DDAY).toMatchObject({
      durationSeconds: "5~300초 사이여야 해요.",
      label: "이름을 입력해 주세요.",
      dates: "날짜를 골라 주세요.",
    });
  });

  it("시험 마지막 날이 시작일보다 앞서면 막는다", () => {
    const broken = drafts.map((draft) =>
      draft.type === "EXAM_CHEER" ? { ...draft, endDate: "2026-12-01" } : draft,
    );
    expect(validateWidgetDrafts(broken).EXAM_CHEER?.dates).toBe(
      "마지막 날이 시작일보다 앞서요.",
    );
  });

  it("꺼 둔 위젯의 틀린 칸은 예전 값을 지킨다", () => {
    const off = drafts.map((draft) =>
      draft.type === "WEATHER" ? { ...draft, enabled: false, durationSeconds: "" } : draft,
    );
    expect(toWidgetSettingDtos(off, settings).find((dto) => dto.type === "WEATHER")).toMatchObject(
      { enabled: false, durationSeconds: 10 },
    );
  });

  it("위젯 비율은 10~50% 정수만 받는다", () => {
    expect(validateRatioPercent("25")).toBeNull();
    expect(validateRatioPercent("5")).toBe("10~50% 사이여야 해요.");
    expect(validateRatioPercent("")).toBe("정수로 입력해 주세요.");
  });
});
