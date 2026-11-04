import { SURVEY_URL } from "@/entities/widget/model/operation";
import type { TimeSlotRule } from "@/entities/widget/model/operation";
import { timeSlotAt } from "@/entities/widget/model/time-slots";
import { readTimeSlot } from "@/entities/widget/model/tv-settings";
import { GAME_WIDGETS } from "@/entities/widget/model/types";
import type { WidgetType } from "@/entities/widget/model/types";

/**
 * 시간대 고정 폼. 규칙 하나가 카드 하나다. 날짜·시각은 브라우저 입력값 그대로
 * ("YYYY-MM-DD", "HH:MM", 서울 기준) 들고 있다가 저장할 때 규칙으로 바꾼다.
 */
export interface TimeSlotDraft {
  id: string;
  label: string;
  widget: WidgetType;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  /** 비면 모든 TV */
  deviceIds: string[];
  /** 클릭 배틀 화면에 설문 QR을 붙인다. */
  surveyEnabled: boolean;
  surveyUrl: string;
  surveyLabel: string;
}

export type TimeSlotDraftErrors = Record<string, string[]>;

export const TIME_SLOT_LABEL_MAX = 30;
const SURVEY_LABEL_MAX = 30;

/** 설문 QR은 게임 화면(오른쪽 위)에만 붙는다. */
export const SURVEY_WIDGETS: readonly WidgetType[] = GAME_WIDGETS;

export function draftFromRule(rule: TimeSlotRule): TimeSlotDraft {
  return {
    id: rule.id,
    label: rule.label,
    widget: rule.widget,
    dateFrom: rule.dates.from,
    dateTo: rule.dates.to,
    timeFrom: rule.time.from,
    timeTo: rule.time.to,
    deviceIds: rule.deviceIds ? [...rule.deviceIds] : [],
    surveyEnabled: rule.survey !== undefined,
    surveyUrl: rule.survey?.url ?? SURVEY_URL,
    surveyLabel: rule.survey?.label ?? "이벤트 설문",
  };
}

/** 새 규칙. 오늘 저녁 두 시간 클릭 배틀이 기본이다. */
export function newTimeSlotDraft(today: string, id: string): TimeSlotDraft {
  return {
    id,
    label: "",
    widget: "CLICK_BATTLE",
    dateFrom: today,
    dateTo: today,
    timeFrom: "20:00",
    timeTo: "22:00",
    deviceIds: [],
    surveyEnabled: false,
    surveyUrl: SURVEY_URL,
    surveyLabel: "이벤트 설문",
  };
}

const isWebUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

/** 카드마다 틀린 곳. 비었으면 저장할 수 있다. */
export function validateTimeSlotDrafts(drafts: readonly TimeSlotDraft[]): TimeSlotDraftErrors {
  const errors: TimeSlotDraftErrors = {};
  for (const draft of drafts) {
    const messages: string[] = [];
    const label = draft.label.trim();
    if (!label) messages.push("이름을 적어 주세요");
    else if (label.length > TIME_SLOT_LABEL_MAX) {
      messages.push(`이름은 ${TIME_SLOT_LABEL_MAX}자까지예요`);
    }
    if (!draft.dateFrom || !draft.dateTo) messages.push("날짜를 정해 주세요");
    else if (draft.dateFrom > draft.dateTo) messages.push("끝 날짜가 시작 날짜보다 빨라요");
    if (!draft.timeFrom || !draft.timeTo) messages.push("시각을 정해 주세요");
    else if (draft.timeFrom === draft.timeTo) messages.push("시작과 끝 시각이 같아요");
    if (draft.surveyEnabled && SURVEY_WIDGETS.includes(draft.widget)) {
      if (!isWebUrl(draft.surveyUrl.trim())) messages.push("설문 링크는 https 주소여야 해요");
      if (!draft.surveyLabel.trim() || draft.surveyLabel.trim().length > SURVEY_LABEL_MAX) {
        messages.push(`설문 이름은 1~${SURVEY_LABEL_MAX}자예요`);
      }
    }
    if (messages.length > 0) errors[draft.id] = messages;
  }
  return errors;
}

/** 저장할 규칙. 형식은 TV와 같은 검사(`readTimeSlot`)를 한 번 더 거친다. */
export function toTimeSlotRules(drafts: readonly TimeSlotDraft[]): TimeSlotRule[] {
  return drafts.flatMap((draft) => {
    const survey =
      draft.surveyEnabled && SURVEY_WIDGETS.includes(draft.widget)
        ? { url: draft.surveyUrl.trim(), label: draft.surveyLabel.trim() }
        : undefined;
    const rule = readTimeSlot({
      id: draft.id,
      widget: draft.widget,
      dates: { from: draft.dateFrom, to: draft.dateTo },
      time: { from: draft.timeFrom, to: draft.timeTo },
      label: draft.label.trim(),
      ...(draft.deviceIds.length > 0 ? { deviceIds: draft.deviceIds } : {}),
      ...(survey ? { survey } : {}),
    });
    return rule ? [rule] : [];
  });
}

export type TimeSlotPhase = "active" | "upcoming" | "ended";

/** 지금 기준 규칙의 상태. 카드 배지에 쓴다. 다음 시작이 없으면 끝난 규칙이다. */
export function timeSlotPhase(rule: TimeSlotRule, now: Date): TimeSlotPhase {
  const state = timeSlotAt([rule], now);
  if (state.rule) return "active";
  return state.nextChangeAt === null ? "ended" : "upcoming";
}
