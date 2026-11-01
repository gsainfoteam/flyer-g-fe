import {
  clampRatioPercent,
  defaultDeviceWidgetSettings,
  settingsToSlotDtos,
} from "./settings";
import { toWidgetSlots } from "./types";
import type { WidgetSlot, WidgetSlotDto, WidgetType } from "./types";

/**
 * TV 한 대가 받는 위젯 묶음 (`GET /signage/devices/{id}/widgets`, flyer-g-be#24 제안).
 *
 * 편성과 따로 받는다. 위젯 설정·데이터가 바뀌어도 편성 버전에 영향을 주지 않고, 위젯
 * 쪽만 다시 받는다. `weather`는 위젯을 껐어도 정보줄에 쓰려고 따로 온다.
 */
export interface DeviceWidgetsDto {
  widgetsVersion: string;
  ratioPercent?: number;
  widgets: WidgetSlotDto[];
  /** 날씨 위젯과 같은 형식의 데이터. 없으면 null */
  weather?: Record<string, unknown> | null;
}

export interface DeviceWidgets {
  version: string;
  ratioPercent: number;
  widgets: WidgetSlot[];
  weather: Record<string, unknown> | null;
}

export function toDeviceWidgets(dto: DeviceWidgetsDto): DeviceWidgets {
  return {
    version: dto.widgetsVersion,
    ratioPercent: clampRatioPercent(dto.ratioPercent),
    widgets: toWidgetSlots(dto.widgets),
    weather: dto.weather ?? null,
  };
}

/** 오프라인 캐시가 직렬화할 때 쓴다. */
export function toDeviceWidgetsDto(feed: DeviceWidgets): DeviceWidgetsDto {
  return {
    widgetsVersion: feed.version,
    ratioPercent: feed.ratioPercent,
    widgets: feed.widgets.map((slot) => ({ ...slot })),
    weather: feed.weather,
  };
}

/** 서버가 아직 위젯을 지원하지 않거나 받기 전 */
export const NO_WIDGETS: DeviceWidgets = {
  version: "none",
  ratioPercent: clampRatioPercent(undefined),
  widgets: [],
  weather: null,
};

/**
 * 서버에 위젯 API가 아직 없다(404). 위젯 없이 돌되, 포스터가 적어 한 바퀴가 짧으면
 * TV가 `standaloneWidgets`로 채운다.
 */
export const WIDGETS_UNSUPPORTED: DeviceWidgets = { ...NO_WIDGETS, version: "unsupported" };

export const isWidgetsUnsupported = (feed: DeviceWidgets) =>
  feed.version === WIDGETS_UNSUPPORTED.version;

/**
 * 서버 없이 화면이 스스로 만들거나 직접 받는 위젯. 날씨는 TV가 Open-Meteo에서, 학식은
 * 같은 도메인 함수(`/api/cafeteria`)에서 받는다. 맛집은 서버 데이터가, D-day·시험 응원은
 * 운영자가 정한 날짜가 있어야 해서 빠진다.
 */
const STANDALONE_TYPES: readonly WidgetType[] = [
  "FORTUNE",
  "MEAL_PICK",
  "CAFETERIA",
  "WEATHER",
  "QUIZ",
  "CLICK_BATTLE",
];

/** 서버 설정이 없을 때 쓰는 위젯. 길이·문구는 기본값이다. */
export function standaloneWidgets(): WidgetSlot[] {
  return toWidgetSlots(
    settingsToSlotDtos(
      defaultDeviceWidgetSettings().widgets.filter((setting) =>
        STANDALONE_TYPES.includes(setting.type),
      ),
    ),
  );
}
