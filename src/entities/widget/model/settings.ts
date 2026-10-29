import {
  DEFAULT_WIDGET_DURATION,
  DEFAULT_WIDGET_EVERY_FRAMES,
  WIDGET_TYPES,
  clampWidgetDuration,
} from "./types";
import type { WidgetSlotDto, WidgetType } from "./types";

/**
 * 기기별 위젯 설정. 운영자가 기기마다 종류별로 하나씩 켜고 끄고, 시간과 빈도를 정한다.
 *
 * 서버는 켜진 설정으로 편성의 `widgets`를 만든다. 학식·날씨·맛집처럼 외부 데이터가
 * 필요한 종류는 서버가 `params.data`를 붙인다. 설정에는 운영자가 정하는 값만 둔다.
 */
export interface WidgetSettingDto {
  type: string;
  enabled: boolean;
  durationSeconds?: number;
  everyFrames?: number;
  params?: Record<string, unknown>;
}

export interface WidgetSetting {
  type: WidgetType;
  enabled: boolean;
  durationSeconds: number;
  everyFrames: number;
  params: Record<string, unknown>;
}

/** 포스터 몇 장마다 한 번의 범위. 1이면 포스터마다 끼운다. */
export const WIDGET_EVERY_FRAMES = { min: 1, max: 20 } as const;

export const WIDGET_LABELS: Record<WidgetType, string> = {
  DDAY: "D-day",
  EXAM_CHEER: "시험 응원",
  FORTUNE: "띠별 운세",
  MEAL_PICK: "메뉴 추천",
  CAFETERIA: "오늘의 학식",
  WEATHER: "오늘 날씨",
  RESTAURANT: "근처 맛집",
};

export const WIDGET_DESCRIPTIONS: Record<WidgetType, string> = {
  DDAY: "정한 날까지 남은 날을 보여 줘요. 날이 지나면 저절로 빠져요.",
  EXAM_CHEER: "시험 2주 전부터 끝나는 날까지만 응원 문구가 나와요.",
  FORTUNE: "12띠 운세. 같은 날에는 모든 TV가 같은 결과예요.",
  MEAL_PICK: "오후 3시 전에는 점심, 그 뒤로는 저녁 메뉴를 추천해요.",
  CAFETERIA: "서버가 받아 온 오늘 메뉴. 메뉴가 없는 날은 빠져요.",
  WEATHER: "서버가 받아 온 날씨. 3시간 넘게 갱신되지 않으면 빠져요.",
  RESTAURANT: "서버가 받아 온 근처 가게를 1시간마다 바꿔 보여 줘요.",
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
    everyFrames: DEFAULT_WIDGET_EVERY_FRAMES,
    params: { ...DEFAULT_PARAMS[type] },
  };
}

export function defaultWidgetSettings(): WidgetSetting[] {
  return WIDGET_TYPES.map(defaultWidgetSetting);
}

function clampEveryFrames(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_WIDGET_EVERY_FRAMES;
  }
  return Math.min(
    WIDGET_EVERY_FRAMES.max,
    Math.max(WIDGET_EVERY_FRAMES.min, Math.round(value)),
  );
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
      everyFrames: clampEveryFrames(dto.everyFrames),
      params: dto.params ?? {},
    };
  });
}

/** 켜진 설정을 편성 슬롯으로. 외부 데이터는 서버(mock)가 붙인다. */
export function settingsToSlotDtos(settings: readonly WidgetSetting[]): WidgetSlotDto[] {
  return settings
    .filter((setting) => setting.enabled)
    .map(({ type, durationSeconds, everyFrames, params }) => ({
      id: `widget-${type.toLowerCase()}`,
      type,
      durationSeconds,
      everyFrames,
      params,
    }));
}

