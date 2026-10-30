import { PREVIEW_DEVICE_ID } from "@/entities/playlist/model/types";
import { ApiError, isApiError } from "@/shared/api/error";
import type { HttpClient } from "@/shared/api/http-client";
import type { WidgetRepository } from "@/shared/api/repositories";
import type { DeviceCredentials } from "@/shared/lib/device-credential";
import { NO_WIDGETS, toDeviceWidgets } from "../model/feed";
import type { DeviceWidgets, DeviceWidgetsDto } from "../model/feed";
import { toDeviceWidgetSettings } from "../model/settings";
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

const notFound = (error: unknown) => isApiError(error) && error.status === 404;

export function createHttpWidgetRepository({
  deviceClient,
  userClient,
  credentials,
}: HttpWidgetRepositoryOptions): WidgetRepository {
  const devicePath = (deviceId: string) =>
    `/signage/devices/${encodeURIComponent(deviceId)}`;
  /** 기기별 마지막 응답. 304면 이것을 그대로 쓴다. */
  const cache = new Map<string, { etag: string | null; feed: DeviceWidgets }>();

  return {
    async getDeviceWidgets(deviceId, signal) {
      // 미리보기는 기기 토큰이 없다. 실제 API에서는 위젯 없이 보여 준다.
      if (deviceId === PREVIEW_DEVICE_ID) return NO_WIDGETS;
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
        // 서버에 위젯 API가 아직 없다. 위젯 없이 포스터만 돈다.
        if (notFound(error)) return NO_WIDGETS;
        throw error;
      }
    },

    async getSettings(deviceId, signal) {
      try {
        return parseWidgetSettings(
          await userClient.request({ path: `${devicePath(deviceId)}/widget-settings`, signal }),
        );
      } catch (error) {
        throw notFound(error) ? widgetsUnsupported() : error;
      }
    },

    async saveSettings(deviceId, settings: DeviceWidgetSettingsDto, signal) {
      try {
        return parseWidgetSettings(
          await userClient.request({
            method: "PUT",
            path: `${devicePath(deviceId)}/widget-settings`,
            body: settings,
            signal,
          }),
        );
      } catch (error) {
        throw notFound(error) ? widgetsUnsupported() : error;
      }
    },
  };
}
