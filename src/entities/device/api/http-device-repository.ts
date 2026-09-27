import type { HttpClient } from "@/shared/api/http-client";
import {
  invalidResponse,
  readArray,
  readIsoDate,
  readNullableString,
  readNumber,
  readObject,
  readString,
  readStringArray,
} from "@/shared/api/parse";
import type { DeviceRepository } from "@/shared/api/repositories";
import { LAYOUT_TYPES } from "@/entities/playlist/model/types";
import type { LayoutType } from "@/entities/playlist/model/types";
import type { JsonObject } from "@/shared/api/parse";
import { DEVICE_ORIENTATIONS, DEVICE_STATUSES } from "../model/types";
import type {
  DeviceInput,
  DeviceOrientation,
  DeviceStatus,
  DeviceWithToken,
  DisplayDevice,
  UpdateDeviceInput,
} from "../model/types";

/**
 * 기기 목록과 관리의 실제 구현 (`API-CHANGES-BACKEND.md` 11.1).
 *
 * | 메서드 | 경로 | 권한 |
 * |---|---|---|
 * | list | `GET /signage/devices` | 검토자 이상 |
 * | create | `POST /signage/devices` → 기기 + `token`(한 번만) | SUPER_ADMIN |
 * | update | `PATCH /signage/devices/{id}` | SUPER_ADMIN |
 * | rotateToken | `POST /signage/devices/{id}/rotate-token` → 기기 + 새 `token` | SUPER_ADMIN |
 *
 *
 * 서버는 봉투 없이 배열을 주고 서버 시각이 없다. `serverTime`은 null로 두고, 화면이
 * 함께 받은 다른 응답의 서버 시각을 쓴다(`API-FOLLOWUP-2026-09.md` 2-2).
 * 상태(ONLINE·OFFLINE·DISABLED)는 서버가 마지막 heartbeat로 판정한다(3분).
 */
function readOneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  path: string,
): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw invalidResponse(path, allowed.join(" | "));
  }
  return value as T;
}

function readNullableDate(
  body: JsonObject,
  key: string,
  path: string,
): Date | null {
  return body[key] === null || body[key] === undefined
    ? null
    : readIsoDate(body, key, path);
}

export function parseDevice(payload: unknown, path = "기기"): DisplayDevice {
  const body = readObject(payload, path);
  const at = (key: string) => `${path}.${key}`;
  const layout = readObject(body.layout, at("layout"));
  const resolution =
    body.resolution === null || body.resolution === undefined
      ? null
      : readObject(body.resolution, at("resolution"));
  return {
    id: readString(body, "id", at("id")),
    name: readString(body, "name", at("name")),
    location: readNullableString(body, "location", at("location")),
    groupIds: readStringArray(body, "groupIds", at("groupIds")),
    orientation: readOneOf<DeviceOrientation>(
      readString(body, "orientation", at("orientation")),
      DEVICE_ORIENTATIONS,
      at("orientation"),
    ),
    resolution: resolution && {
      width: readNumber(resolution, "width", at("resolution.width")),
      height: readNumber(resolution, "height", at("resolution.height")),
    },
    lastSeenAt: readNullableDate(body, "lastSeenAt", at("lastSeenAt")),
    appVersion: readNullableString(body, "appVersion", at("appVersion")),
    status: readOneOf<DeviceStatus>(
      readString(body, "status", at("status")),
      DEVICE_STATUSES,
      at("status"),
    ),
    layout: {
      type: readOneOf<LayoutType>(
        readString(layout, "type", at("layout.type")),
        LAYOUT_TYPES,
        at("layout.type"),
      ),
      rotationSeconds: readNumber(
        layout,
        "rotationSeconds",
        at("layout.rotationSeconds"),
      ),
    },
    refreshAfterSeconds: readNumber(
      body,
      "refreshAfterSeconds",
      at("refreshAfterSeconds"),
    ),
    lastPlaylistVersion: readNullableString(
      body,
      "lastPlaylistVersion",
      at("lastPlaylistVersion"),
    ),
    lastRenderOkAt: readNullableDate(
      body,
      "lastRenderOkAt",
      at("lastRenderOkAt"),
    ),
    tokenIssuedAt: readNullableDate(body, "tokenIssuedAt", at("tokenIssuedAt")),
  };
}

/** 등록·재발급 응답. 기기 필드와 `token`이 한 객체에 온다. */
export function parseDeviceWithToken(payload: unknown): DeviceWithToken {
  const body = readObject(payload);
  return { device: parseDevice(body), token: readString(body, "token") };
}

const devicePath = (id: string) => `/signage/devices/${encodeURIComponent(id)}`;

export function createHttpDeviceRepository(
  client: HttpClient,
): DeviceRepository {
  return {
    async list(signal) {
      const items = readArray(
        await client.request({ path: "/signage/devices", signal }),
      ).map((item, index) => parseDevice(item, `[${index}]`));
      return { items, serverTime: null };
    },

    async create(input: DeviceInput, signal) {
      return parseDeviceWithToken(
        await client.request({
          method: "POST",
          path: "/signage/devices",
          body: input,
          signal,
        }),
      );
    },

    async update(id, input: UpdateDeviceInput, signal) {
      return parseDevice(
        await client.request({
          method: "PATCH",
          path: devicePath(id),
          body: input,
          signal,
        }),
      );
    },

    async rotateToken(id, signal) {
      return parseDeviceWithToken(
        await client.request({
          method: "POST",
          path: `${devicePath(id)}/rotate-token`,
          signal,
        }),
      );
    },
  };
}
