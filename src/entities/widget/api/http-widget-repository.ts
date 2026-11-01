import { PREVIEW_DEVICE_ID } from "@/entities/playlist/model/types";
import { ApiError, isApiError } from "@/shared/api/error";
import type { HttpClient } from "@/shared/api/http-client";
import type { WidgetRepository } from "@/shared/api/repositories";
import type { DeviceCredentials } from "@/shared/lib/device-credential";
import { NO_WIDGETS, WIDGETS_UNSUPPORTED, toDeviceWidgets } from "../model/feed";
import { fetchOpenMeteoWeather } from "./open-meteo";
import { EMPTY_TV_SETTINGS, parseTvSettings } from "../model/tv-settings";
import type { TvSettings } from "../model/tv-settings";
import type { DeviceWidgets, DeviceWidgetsDto } from "../model/feed";
import {
  defaultDeviceWidgetSettings,
  settingsToSlotDtos,
  toDeviceWidgetSettings,
} from "../model/settings";
import type { DeviceWidgetSettingsDto, WidgetSettingDto } from "../model/settings";
import type { WidgetSlotDto } from "../model/types";

/**
 * 위젯 API (flyer-g-be#24 제안).
 *
 * | 동작 | 경로 | 인증 |
 * |---|---|---|
 * | TV 위젯 | `GET /signage/devices/{id}/widgets` | 기기 토큰 |
 * | 설정 조회 | `GET /signage/devices/{id}/widget-settings` | SUPER_ADMIN |
 * | 설정 저장 | `PUT /signage/devices/{id}/widget-settings` | SUPER_ADMIN |
 *
 * 백엔드에 아직 없다. TV는 404면 위젯 없이 돌고, 관리 화면은 지원하지 않는다고 알린다.
 * 응답은 믿지 않고 읽는다. 모양이 틀린 항목은 버리고, 위젯 내용(`params`)은 화면이
 * 다시 검사한다.
 */
export interface HttpWidgetRepositoryOptions {
  /** 인증 헤더 없이 부르는 client. 기기 토큰은 요청마다 싣는다. */
  deviceClient: HttpClient;
  /** 관리 화면용 사용자 client */
  userClient: HttpClient;
  /**
   * 같은 도메인 함수(`/api/tv-settings`)에 로그인 토큰을 실어 보내는 client. 저장할 때 쓴다.
   */
  settingsClient: HttpClient;
  credentials: DeviceCredentials;
}

export function widgetsUnsupported(): ApiError {
  return new ApiError({
    kind: "http",
    code: "WIDGETS_UNSUPPORTED",
    message: "서버가 아직 위젯 설정을 지원하지 않아요.",
    status: 404,
  });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNumberish = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

function readSlots(value: unknown): WidgetSlotDto[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): WidgetSlotDto[] => {
    if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.type !== "string") {
      return [];
    }
    return [
      {
        id: raw.id,
        type: raw.type,
        durationSeconds: readNumberish(raw.durationSeconds),
        params: isRecord(raw.params) ? raw.params : {},
      },
    ];
  });
}

export function parseDeviceWidgets(payload: unknown): DeviceWidgets {
  if (!isRecord(payload)) return NO_WIDGETS;
  const dto: DeviceWidgetsDto = {
    widgetsVersion:
      typeof payload.widgetsVersion === "string" ? payload.widgetsVersion : "unknown",
    ratioPercent: readNumberish(payload.ratioPercent),
    widgets: readSlots(payload.widgets),
    weather: isRecord(payload.weather) ? payload.weather : null,
  };
  return toDeviceWidgets(dto);
}

export function parseWidgetSettings(payload: unknown) {
  const body = isRecord(payload) ? payload : {};
  const widgets = (Array.isArray(body.widgets) ? body.widgets : []).flatMap(
    (raw): WidgetSettingDto[] =>
      isRecord(raw) && typeof raw.type === "string"
        ? [
            {
              type: raw.type,
              enabled: raw.enabled !== false,
              durationSeconds: readNumberish(raw.durationSeconds),
              params: isRecord(raw.params) ? raw.params : {},
            },
          ]
        : [],
  );
  return toDeviceWidgetSettings({ ratioPercent: readNumberish(body.ratioPercent), widgets });
}

/** 미리보기용 기본 위젯. 실제 기기의 설정이 아니라 새 기기의 기본값이다. */
export function previewWidgets(): DeviceWidgets {
  const defaults = defaultDeviceWidgetSettings();
  return toDeviceWidgets({
    widgetsVersion: "preview-defaults",
    ratioPercent: defaults.ratioPercent,
    widgets: settingsToSlotDtos(defaults.widgets),
    weather: null,
  });
}

const notFound = (error: unknown) => isApiError(error) && error.status === 404;

/**
 * 저장된 TV 설정. 함수가 없는 곳(Vite 개발 서버)은 index.html이 오므로 JSON일 때만 읽고,
 * 아니면 빈 설정이다.
 */
async function readTvSettings(signal?: AbortSignal): Promise<TvSettings> {
  const response = await fetch("/api/tv-settings", { signal, cache: "no-store" });
  const isJson = response.headers.get("Content-Type")?.includes("application/json");
  return response.ok && isJson ? parseTvSettings(await response.json()) : EMPTY_TV_SETTINGS;
}

/** 저장된 기기 위젯 설정 → TV가 읽는 위젯 묶음 */
function feedFromSettings(settings: TvSettings, deviceId: string): DeviceWidgets | null {
  const dto = settings.devices[deviceId];
  if (!dto) return null;
  const device = toDeviceWidgetSettings(dto);
  return toDeviceWidgets({
    widgetsVersion: `tv-settings:${settings.updatedAt ?? "none"}`,
    ratioPercent: device.ratioPercent,
    widgets: settingsToSlotDtos(device.widgets),
    weather: null,
  });
}

export function createHttpWidgetRepository({
  deviceClient,
  settingsClient,
  credentials,
}: HttpWidgetRepositoryOptions): WidgetRepository {
  const devicePath = (deviceId: string) =>
    `/signage/devices/${encodeURIComponent(deviceId)}`;
  /** 기기별 마지막 응답. 304면 이것을 그대로 쓴다. */
  const cache = new Map<string, { etag: string | null; feed: DeviceWidgets }>();

  return {
    async getDeviceWidgets(deviceId, signal) {
      // 미리보기는 기기 토큰이 없어 서버에 묻지 않는다. 기본 위젯으로 모양만 보여 준다.
      // 학식·날씨·맛집은 데이터가 없어 화면이 알아서 뺀다.
      if (deviceId === PREVIEW_DEVICE_ID) return previewWidgets();
      const token = credentials.get(deviceId);
      if (token === null) return NO_WIDGETS;
      const previous = cache.get(deviceId);

      let etag: string | null = null;
      try {
        const payload = await deviceClient.request<unknown>({
          path: `${devicePath(deviceId)}/widgets`,
          headers: {
            "X-Device-Token": token,
            ...(previous?.etag ? { "If-None-Match": previous.etag } : {}),
          },
          allowNotModified: previous !== undefined,
          onResponse: (response) => {
            etag = response.headers.get("ETag");
          },
          signal,
        });
        if (payload === undefined && previous) return previous.feed;
        const feed = parseDeviceWidgets(payload);
        cache.set(deviceId, { etag, feed });
        return feed;
      } catch (error) {
        // 서버에 위젯 API가 아직 없다. 관리 화면에서 저장한 설정(KV)이 있으면 그것을,
        // 없으면 포스터가 적을 때만 TV가 기본 위젯으로 채운다.
        if (notFound(error)) {
          const saved = await readTvSettings(signal).catch(() => EMPTY_TV_SETTINGS);
          return feedFromSettings(saved, deviceId) ?? WIDGETS_UNSUPPORTED;
        }
        throw error;
      }
    },

    getLocalWeather(signal) {
      return fetchOpenMeteoWeather(new Date(), signal);
    },

    async getLocalCafeteria(signal) {
      // 같은 도메인의 Pages 함수. Vite 개발 서버에는 없어 index.html이 오므로 JSON만 받는다.
      const response = await fetch("/api/cafeteria", { signal });
      const isJson = response.headers.get("Content-Type")?.includes("application/json");
      return response.ok && isJson ? ((await response.json()) as unknown) : null;
    },

    getTvSettings(signal) {
      return readTvSettings(signal);
    },

    async saveTimeSlots(rules, signal) {
      return parseTvSettings(
        await settingsClient.request({
          method: "PUT",
          path: "/api/tv-settings",
          body: { timeSlots: rules },
          signal,
        }),
      );
    },

    // 위젯 설정은 같은 도메인 함수(KV)에 기기별로 둔다. 저장한 적이 없으면 기본값이다.
    async getSettings(deviceId, signal) {
      const saved = (await readTvSettings(signal)).devices[deviceId];
      return saved ? toDeviceWidgetSettings(saved) : defaultDeviceWidgetSettings();
    },

    async saveSettings(deviceId, settings: DeviceWidgetSettingsDto, signal) {
      const saved = parseTvSettings(
        await settingsClient.request({
          method: "PUT",
          path: "/api/tv-settings",
          body: { devices: { [deviceId]: settings } },
          signal,
        }),
      );
      return toDeviceWidgetSettings(saved.devices[deviceId] ?? settings);
    },
  };
}
