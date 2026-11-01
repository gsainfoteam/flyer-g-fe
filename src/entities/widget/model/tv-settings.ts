import type { TimeSlotRule } from "./operation";
import type { DeviceWidgetSettingsDto, WidgetSettingDto } from "./settings";
import { WIDGET_TYPES } from "./types";
import type { WidgetType } from "./types";

/**
 * 관리 화면에서 바꾸는 TV 설정. 같은 도메인 함수(`/api/tv-settings`)가 Cloudflare KV에 한
 * 문서로 저장하고, TV와 관리 화면이 함께 읽는다. 백엔드 위젯 API(flyer-g-be#24) 대신이다.
 *
 * - `devices`: 기기별 위젯 설정(위젯 비율, 위젯마다 켜기·시간·내용)
 * - `timeSlots`: 시간대 점유 규칙. 아직 한 번도 저장하지 않았으면 null이고, 그때는 코드의
 *   기본 규칙(`operation.ts`의 `TIME_SLOTS`)을 쓴다.
 *
 * 저장소의 값은 믿지 않고 읽는다. 모양이 틀린 항목은 버린다.
 */
export interface TvSettings {
  devices: Record<string, DeviceWidgetSettingsDto>;
  timeSlots: TimeSlotRule[] | null;
  updatedAt: string | null;
}

export const EMPTY_TV_SETTINGS: TvSettings = { devices: {}, timeSlots: null, updatedAt: null };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const text = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim() && value.trim().length <= max ? value.trim() : null;

const isWidgetType = (value: unknown): value is WidgetType =>
  typeof value === "string" && (WIDGET_TYPES as readonly string[]).includes(value);

function readWidgetSetting(raw: unknown): WidgetSettingDto[] {
  if (!isRecord(raw) || !isWidgetType(raw.type) || typeof raw.enabled !== "boolean") return [];
  const duration = raw.durationSeconds;
  return [
    {
      type: raw.type,
      enabled: raw.enabled,
      durationSeconds: typeof duration === "number" && Number.isFinite(duration) ? duration : 0,
      params: isRecord(raw.params) ? raw.params : {},
    },
  ];
}

function readDevice(raw: unknown): DeviceWidgetSettingsDto | null {
  if (!isRecord(raw) || !Array.isArray(raw.widgets)) return null;
  return {
    ratioPercent: typeof raw.ratioPercent === "number" ? raw.ratioPercent : undefined,
    widgets: raw.widgets.flatMap(readWidgetSetting),
  } as DeviceWidgetSettingsDto;
}

/** 시간대 규칙 하나. 틀리면 null(날짜·시각 형식, 위젯 종류, 이름 길이, 날짜 순서) */
export function readTimeSlot(raw: unknown): TimeSlotRule | null {
  if (!isRecord(raw) || !isRecord(raw.dates) || !isRecord(raw.time)) return null;
  const id = text(raw.id, 80);
  const label = text(raw.label, 30);
  const { from: dateFrom, to: dateTo } = raw.dates;
  const { from: timeFrom, to: timeTo } = raw.time;
  if (!id || !label || !isWidgetType(raw.widget)) return null;
  if (typeof dateFrom !== "string" || typeof dateTo !== "string") return null;
  if (!DATE.test(dateFrom) || !DATE.test(dateTo) || dateFrom > dateTo) return null;
  if (typeof timeFrom !== "string" || typeof timeTo !== "string") return null;
  if (!TIME.test(timeFrom) || !TIME.test(timeTo) || timeFrom === timeTo) return null;
  const deviceIds = Array.isArray(raw.deviceIds)
    ? raw.deviceIds.filter((item): item is string => typeof item === "string" && item.length > 0)
    : null;
  const survey =
    isRecord(raw.survey) && text(raw.survey.url, 500)
      ? { url: text(raw.survey.url, 500)!, label: text(raw.survey.label, 30) ?? "설문" }
      : undefined;
  return {
    id,
    widget: raw.widget,
    dates: { from: dateFrom, to: dateTo },
    time: { from: timeFrom, to: timeTo },
    label,
    ...(deviceIds && deviceIds.length > 0 ? { deviceIds } : {}),
    ...(survey ? { survey } : {}),
  };
}

export function parseTvSettings(raw: unknown): TvSettings {
  if (!isRecord(raw)) return EMPTY_TV_SETTINGS;
  const devices: Record<string, DeviceWidgetSettingsDto> = {};
  if (isRecord(raw.devices)) {
    for (const [id, value] of Object.entries(raw.devices)) {
      const device = readDevice(value);
      if (device) devices[id] = device;
    }
  }
  const timeSlots = Array.isArray(raw.timeSlots)
    ? raw.timeSlots.flatMap((item) => {
        const rule = readTimeSlot(item);
        return rule ? [rule] : [];
      })
    : null;
  return {
    devices,
    timeSlots,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
}

/** 이 기기에 걸리는 규칙. 대상이 없으면 모든 TV다. */
export function timeSlotsForDevice(
  rules: readonly TimeSlotRule[],
  deviceId: string,
): TimeSlotRule[] {
  return rules.filter((rule) => !rule.deviceIds || rule.deviceIds.includes(deviceId));
}
