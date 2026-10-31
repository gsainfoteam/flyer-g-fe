import {
  DEFAULT_WIDGET_DURATION,
  WIDGET_TYPES,
  clampWidgetDuration,
} from "./types";
import type { WidgetSlotDto, WidgetType } from "./types";

/**
 * 기기별 위젯 설정. 운영자가 기기마다 종류별로 하나씩 켜고 끄고 시간을 정하고,
 * 기기 단위로 위젯 비율(화면 시간 중 위젯 몫의 상한)을 정한다. 언제 끼울지는
 * `policy.ts`가 정한다.
 *
 * 서버는 켜진 설정으로 TV의 위젯 목록을 만든다. 학식·날씨·맛집처럼 외부 데이터가
 * 필요한 종류는 서버가 `params.data`를 붙인다. 설정에는 운영자가 정하는 값만 둔다.
 */
export interface WidgetSettingDto {
  type: string;
  enabled: boolean;
  durationSeconds?: number;
  params?: Record<string, unknown>;
}

export interface WidgetSetting {
  type: WidgetType;
  enabled: boolean;
  durationSeconds: number;
  params: Record<string, unknown>;
}

/**
 * 위젯 비율(%). 화면 시간 중 위젯이 차지할 수 있는 몫의 상한이다. 승인된 포스터가
 * 주인공이라 기본은 4분의 1이다.
 */
export const WIDGET_RATIO_PERCENT = { min: 10, max: 50, fallback: 25 } as const;

export function clampRatioPercent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return WIDGET_RATIO_PERCENT.fallback;
  }
  return Math.min(
    WIDGET_RATIO_PERCENT.max,
    Math.max(WIDGET_RATIO_PERCENT.min, Math.round(value)),
  );
}

/** 기기 하나의 위젯 설정 묶음 */
export interface DeviceWidgetSettingsDto {
  ratioPercent?: number;
  widgets: WidgetSettingDto[];
}

export interface DeviceWidgetSettings {
  ratioPercent: number;
  widgets: WidgetSetting[];
}

export const WIDGET_LABELS: Record<WidgetType, string> = {
  DDAY: "D-day",
  EXAM_CHEER: "시험 응원",
  FORTUNE: "띠별 운세",
  MEAL_PICK: "메뉴 추천",
  CAFETERIA: "오늘의 학식",
  WEATHER: "오늘 날씨",
  RESTAURANT: "근처 맛집",
  QUIZ: "오늘의 퀴즈",
};

export const WIDGET_DESCRIPTIONS: Record<WidgetType, string> = {
  DDAY: "정한 날까지 남은 날을 보여 줘요. 날이 지나면 저절로 빠져요.",
  EXAM_CHEER: "시험 2주 전부터 끝나는 날까지만 응원 문구가 나와요.",
  FORTUNE: "12띠 운세. 같은 날에는 모든 TV가 같은 결과예요.",
  MEAL_PICK: "점심·저녁 전(10:30~13:30, 16:30~19:30)에만 메뉴를 추천해요.",
  CAFETERIA: "끼니 시간대(아침·점심·저녁 전후)에만 오늘 메뉴가 나와요.",
  WEATHER: "가끔(30분에 한 번까지) 크게 나와요. 상단 바에는 늘 떠 있어요.",
  RESTAURANT: "근처 가게를 1시간마다 바꿔 보여 줘요.",
  QUIZ: "QR로 폰에서 답을 골라요. 정답은 다음 날 공개돼요.",
};

/** 운영자가 날짜를 정해야 하는 종류의 기본값. 새 기기에도 바로 쓸 수 있게 둔다. */
const DEFAULT_PARAMS: Partial<Record<WidgetType, Record<string, unknown>>> = {
  DDAY: { label: "종강", date: "2026-12-18T15:00:00.000Z" },
  EXAM_CHEER: {
    label: "기말고사",
    startsAt: "2026-12-13T15:00:00.000Z",
    endsAt: "2026-12-18T15:00:00.000Z",
  },
};

export function defaultWidgetSetting(type: WidgetType): WidgetSetting {
  return {
    type,
    enabled: true,
    durationSeconds: DEFAULT_WIDGET_DURATION[type],
    params: { ...DEFAULT_PARAMS[type] },
  };
}

export function defaultWidgetSettings(): WidgetSetting[] {
  return WIDGET_TYPES.map(defaultWidgetSetting);
}

/**
 * 전송 모델 → 도메인 모델. 종류마다 하나씩, 정해진 순서로 돌려준다. 서버가 빠뜨린
 * 종류는 기본값(켜짐)으로 채운다. 새 위젯이 생기면 기존 기기에도 나타난다.
 */
export function toWidgetSettings(dtos: readonly WidgetSettingDto[]): WidgetSetting[] {
  return WIDGET_TYPES.map((type) => {
    const dto = dtos.find((item) => item.type === type);
    if (!dto) return defaultWidgetSetting(type);
    return {
      type,
      enabled: dto.enabled,
      durationSeconds: clampWidgetDuration(type, dto.durationSeconds),
      params: dto.params ?? {},
    };
  });
}

export function toDeviceWidgetSettings(dto: DeviceWidgetSettingsDto): DeviceWidgetSettings {
  return {
    ratioPercent: clampRatioPercent(dto.ratioPercent),
    widgets: toWidgetSettings(dto.widgets),
  };
}

export function defaultDeviceWidgetSettings(): DeviceWidgetSettings {
  return { ratioPercent: WIDGET_RATIO_PERCENT.fallback, widgets: defaultWidgetSettings() };
}

/** 켜진 설정을 TV 위젯 슬롯으로. 외부 데이터는 서버(mock)가 붙인다. */
export function settingsToSlotDtos(settings: readonly WidgetSetting[]): WidgetSlotDto[] {
  return settings
    .filter((setting) => setting.enabled)
    .map(({ type, durationSeconds, params }) => ({
      id: `widget-${type.toLowerCase()}`,
      type,
      durationSeconds,
      params,
    }));
}

