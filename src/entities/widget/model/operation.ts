import type { WidgetSlotDto, WidgetType } from "./types";

/**
 * TV 운영 설정. 서버(flyer-g-be#24)에 위젯·시간대 설정이 생기기 전까지 화면이 들고 있다.
 * 바꾸려면 이 파일을 고쳐 배포한다(Cloudflare Pages 1–2분). 서버가 위젯 설정을 주면
 * `widgets`·`durations`는 서버 값을 따르고, 시간대 점유(`TIME_SLOTS`)는 계속 여기서 읽는다.
 */

/**
 * 설문 링크. 비워 두면 설문 QR과 설문 위젯이 숨는다.
 *
 * ⚠️ 공개 설정 필요: 2026-11-02 기준 이 Notion 페이지는 로그인해야 열린다. QR을 찍은
 * 사람이 바로 응답할 수 있게 Notion에서 "웹에 게시"(또는 양식 공유)를 켜 둘 것.
 */
export const SURVEY_URL = "https://app.notion.com/p/409084b8aa7980be943ad6c656b91bf7?pvs=106";

/** 위젯별 머무는 시간(초). 서버 설정이 없을 때 쓴다. 없는 종류는 기본값 */
export const WIDGET_DURATIONS: Partial<Record<WidgetType, number>> = {
  FORTUNE: 30,
  MEAL_PICK: 10,
  CAFETERIA: 10,
  WEATHER: 10,
  QUIZ: 15,
  CLICK_BATTLE: 20,
  SURVEY: 15,
};

/**
 * 설문 위젯 내용. 설문 링크는 화면(이 파일)이 정하므로, 서버·mock이 주는 설문 위젯에
 * 링크가 없으면 이 값으로 채운다(`withSurveyParams`).
 */
export const SURVEY_PARAMS = {
  url: SURVEY_URL,
  title: "전단지 설문에 참여해 주세요",
  description: "기숙사 로비 TV를 어떻게 쓰고 계신지 알려 주세요. 1분이면 끝나요.",
} as const;

/**
 * 포스터가 많아도 평소 순환에 늘 넣는 위젯(위젯 비율 상한은 지킨다). 서버 설정이 없을 때만.
 * 설문 위젯은 이벤트 시간 밖에서 설문 QR을 보여 준다.
 */
export const EXTRA_WIDGETS: readonly WidgetSlotDto[] = [
  { id: "widget-survey", type: "SURVEY", params: { ...SURVEY_PARAMS } },
];

/**
 * 시간대 점유. 이 시간에는 순환을 멈추고 정한 위젯만 띄운다. 끝나면 하던 순환으로 돌아간다.
 *
 * - `dates`: 서울 날짜, 양끝 포함. `time`: 서울 시각, 끝은 포함하지 않는다.
 * - 겹치면 먼저 적힌 규칙이 이긴다.
 * - `survey`가 있으면 그 시간대 화면에만 설문 QR을 붙인다(지금은 클릭 배틀).
 */
export interface TimeSlotRule {
  id: string;
  widget: WidgetType;
  dates: { from: string; to: string };
  time: { from: string; to: string };
  /** 정보줄에 "○○ · 22:00까지"로 쓴다. */
  label: string;
  survey?: { url: string; label: string };
}

export const TIME_SLOTS: readonly TimeSlotRule[] = [
  {
    id: "2026-11-event-click-battle",
    widget: "CLICK_BATTLE",
    dates: { from: "2026-11-02", to: "2026-11-07" },
    time: { from: "20:00", to: "22:00" },
    label: "클릭 배틀 이벤트",
    survey: { url: SURVEY_URL, label: "이벤트 설문" },
  },
];
