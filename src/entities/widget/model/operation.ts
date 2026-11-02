import type { WidgetSlotDto, WidgetType } from "./types";

/**
 * TV 운영 설정. 서버(flyer-g-be#24)에 위젯·시간대 설정이 생기기 전까지 화면이 들고 있다.
 * 바꾸려면 이 파일을 고쳐 배포한다(Cloudflare Pages 1–2분). 서버가 위젯 설정을 주면
 * `widgets`·`durations`는 서버 값을 따르고, 시간대 점유(`TIME_SLOTS`)는 계속 여기서 읽는다.
 */

/**
 * 설문 링크. 비워 두면 설문 QR과 설문 위젯이 숨는다.
 * 로그인 없이 열리는 공개 링크여야 한다(Notion "웹에 게시"의 notion.site 주소).
 */
export const SURVEY_URL = "https://pacific-switch-8c6.notion.site/409084b8aa7980be943ad6c656b91bf7";

/** 위젯별 머무는 시간(초). 서버 설정이 없을 때 쓴다. 없는 종류는 기본값 */
export const WIDGET_DURATIONS: Partial<Record<WidgetType, number>> = {
  FORTUNE: 30,
  MEAL_PICK: 10,
  CAFETERIA: 10,
  WEATHER: 10,
  QUIZ: 15,
  CLICK_BATTLE: 20,
  SURVEY: 15,
  SHUFFLEBOARD: 20,
};

/**
 * 위젯 공개일(서울 날짜). 이 날짜 전에는 평소 순환에서 뺀다. 0시가 되면 배포 없이 들어온다.
 * 시간대 고정은 공개일과 상관없이 고를 수 있다(미리 시험해 보거나 행사에 먼저 쓸 때).
 */
export const WIDGET_RELEASES: Partial<Record<WidgetType, string>> = {
  SHUFFLEBOARD: "2026-11-05",
};

/** 오늘(서울 날짜 "YYYY-MM-DD") 평소 순환에 넣어도 되는 위젯인가 */
export const isWidgetReleased = (type: WidgetType, today: string): boolean =>
  (WIDGET_RELEASES[type] ?? "") <= today;

/**
 * 설문 위젯 내용. 설문 링크는 화면(이 파일)이 정하므로, 서버·mock이 주는 설문 위젯에
 * 링크가 없으면 이 값으로 채운다(`withSurveyParams`).
 */
export const SURVEY_PARAMS = {
  url: SURVEY_URL,
  title: "전단지 피드백 설문에 참여해 주세요",
  description: "응답자 중 추첨으로 경품을 드려요 · 11/8까지",
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
  /** 적용할 TV. 없으면 모든 TV */
  deviceIds?: string[];
  survey?: { url: string; label: string };
}

/**
 * 기본 규칙. 관리 화면에서 한 번이라도 저장했으면 TV는 저장된 규칙(KV)을 쓰고 이 값은
 * 쓰지 않는다. 11월 이벤트(20:00–22:00)는 11/4까지 클릭 배틀, 11/5부터 셔플보드다.
 */
export const TIME_SLOTS: readonly TimeSlotRule[] = [
  {
    id: "2026-11-event-click-battle",
    widget: "CLICK_BATTLE",
    dates: { from: "2026-11-02", to: "2026-11-04" },
    time: { from: "20:00", to: "22:00" },
    label: "클릭 배틀 이벤트",
    survey: { url: SURVEY_URL, label: "이벤트 설문" },
  },
  {
    id: "2026-11-event-shuffleboard",
    widget: "SHUFFLEBOARD",
    dates: { from: "2026-11-05", to: "2026-11-07" },
    time: { from: "20:00", to: "22:00" },
    label: "컬링 이벤트",
    survey: { url: SURVEY_URL, label: "이벤트 설문" },
  },
];
