import { clampRatioPercent } from "./settings";
import { toWidgetSlots } from "./types";
import type { WidgetSlot, WidgetSlotDto } from "./types";

/**
 * TV 한 대가 받는 위젯 묶음 (`GET /signage/devices/{id}/widgets`, flyer-g-be#24 제안).
 *
 * 편성과 따로 받는다. 위젯 설정·데이터가 바뀌어도 편성 버전에 영향을 주지 않고, 위젯
 * 쪽만 다시 받는다. `weather`는 위젯을 껐어도 상단 바에 쓰려고 따로 온다.
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
