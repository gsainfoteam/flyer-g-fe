import { WIDGET_RATIO_PERCENT } from "@/entities/widget/model/settings";
import type {
  WidgetSetting,
  WidgetSettingDto,
} from "@/entities/widget/model/settings";
import { WIDGET_DURATION_SECONDS } from "@/entities/widget/model/types";
import type { WidgetType } from "@/entities/widget/model/types";
import {
  fromSeoulInput,
  parseIsoUtc,
  toSeoulDateInputValue,
} from "@/shared/lib/datetime";

/**
 * 기기 위젯 설정 폼. 숫자와 날짜 칸은 입력 중 비거나 틀릴 수 있어 문자열로 들고
 * 있다가 보낼 때 바꾼다. 날짜는 서울 기준 "YYYY-MM-DD"로 입력받는다.
 */
export interface WidgetSettingDraft {
  type: WidgetType;
  enabled: boolean;
  durationSeconds: string;
  /** D-day·시험 응원의 이름 */
  label: string;
  /** D-day 날짜, 시험 시작일 */
  startDate: string;
  /** 시험 마지막 날 */
  endDate: string;
}

export type WidgetDraftErrors = Partial<
  Record<WidgetType, Partial<Record<"durationSeconds" | "label" | "dates", string>>>
>;

/** 날짜를 정해야 하는 종류. 이름도 함께 받는다. */
export const DATED_WIDGETS: readonly WidgetType[] = ["DDAY", "EXAM_CHEER"];

const LABEL_MAX_LENGTH = 20;

function dateInput(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    return toSeoulDateInputValue(parseIsoUtc(value));
  } catch {
    return "";
  }
}

export function draftFromSetting(setting: WidgetSetting): WidgetSettingDraft {
  const { params } = setting;
  return {
    type: setting.type,
    enabled: setting.enabled,
    durationSeconds: String(setting.durationSeconds),
    label: typeof params.label === "string" ? params.label : "",
    startDate: dateInput(setting.type === "DDAY" ? params.date : params.startsAt),
    // 시험 마지막 날. 그날 서울 자정으로 주고받는다.
    endDate: setting.type === "EXAM_CHEER" ? dateInput(params.endsAt) : "",
  };
}

function rangeError(
  value: string,
  { min, max }: { min: number; max: number },
  unit: string,
): string | null {
  const number = Number(value);
  if (value.trim() === "" || !Number.isInteger(number)) return `정수로 입력해 주세요.`;
  if (number < min || number > max) return `${min}~${max}${unit} 사이여야 해요.`;
  return null;
}

/** 꺼 둔 위젯은 검사하지 않는다. 켤 때 바로잡으면 된다. */
export function validateWidgetDrafts(
  drafts: readonly WidgetSettingDraft[],
): WidgetDraftErrors {
  const errors: WidgetDraftErrors = {};
  for (const draft of drafts) {
    if (!draft.enabled) continue;
    const own: NonNullable<WidgetDraftErrors[WidgetType]> = {};
    const duration = rangeError(draft.durationSeconds, WIDGET_DURATION_SECONDS, "초");
    if (duration) own.durationSeconds = duration;

    if (DATED_WIDGETS.includes(draft.type)) {
      const label = draft.label.trim();
      if (!label) own.label = "이름을 입력해 주세요.";
      else if (label.length > LABEL_MAX_LENGTH) {
        own.label = `이름은 ${LABEL_MAX_LENGTH}자까지 쓸 수 있어요.`;
      }
      if (!draft.startDate) own.dates = "날짜를 골라 주세요.";
      else if (draft.type === "EXAM_CHEER") {
        if (!draft.endDate) own.dates = "마지막 날을 골라 주세요.";
        else if (draft.endDate < draft.startDate) {
          own.dates = "마지막 날이 시작일보다 앞서요.";
        }
      }
    }
    if (Object.keys(own).length > 0) errors[draft.type] = own;
  }
  return errors;
}

export function toWidgetSettingDtos(
  drafts: readonly WidgetSettingDraft[],
  current: readonly WidgetSetting[],
): WidgetSettingDto[] {
  return drafts.map((draft) => {
    const previous = current.find((setting) => setting.type === draft.type);
    // 꺼 둔 위젯의 칸이 틀렸으면 예전 값을 지킨다.
    const number = (value: string, fallback: number) =>
      Number.isInteger(Number(value)) && value.trim() !== "" ? Number(value) : fallback;
    let params = previous?.params ?? {};
    if (draft.type === "DDAY" && draft.startDate) {
      params = {
        label: draft.label.trim(),
        date: fromSeoulInput(draft.startDate).toISOString(),
      };
    }
    if (draft.type === "EXAM_CHEER" && draft.startDate && draft.endDate) {
      params = {
        label: draft.label.trim(),
        startsAt: fromSeoulInput(draft.startDate).toISOString(),
        endsAt: fromSeoulInput(draft.endDate).toISOString(),
      };
    }
    return {
      type: draft.type,
      enabled: draft.enabled,
      durationSeconds: number(draft.durationSeconds, previous?.durationSeconds ?? 10),
      params,
    };
  });
}

/** 기기 위젯 비율(%) 입력 검사. 틀리면 문구, 맞으면 null */
export function validateRatioPercent(value: string): string | null {
  return rangeError(value, WIDGET_RATIO_PERCENT, "%");
}
