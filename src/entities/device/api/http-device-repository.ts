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
import { DEVICE_ORIENTATIONS, DEVICE_STATUSES } from "../model/types";
import type {
  DeviceOrientation,
  DeviceStatus,
  DisplayDevice,
} from "../model/types";

/**
 * 기기 목록의 실제 구현 (`API-CHANGES-BACKEND.md` 11.1). 검토자 이상만 조회한다.
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

export function parseDevice(payload: unknown, index: number): DisplayDevice {
  const path = `[${index}]`;
  const body = readObject(payload, path);
  const at = (key: string) => `${path}.${key}`;
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
    lastSeenAt:
      body.lastSeenAt === null || body.lastSeenAt === undefined
        ? null
        : readIsoDate(body, "lastSeenAt", at("lastSeenAt")),
    appVersion: readNullableString(body, "appVersion", at("appVersion")),
    status: readOneOf<DeviceStatus>(
      readString(body, "status", at("status")),
      DEVICE_STATUSES,
      at("status"),
    ),
  };
}

export function createHttpDeviceRepository(
  client: HttpClient,
): DeviceRepository {
  return {
    async list(signal) {
      const items = readArray(
        await client.request({ path: "/signage/devices", signal }),
      ).map(parseDevice);
      return { items, serverTime: null };
    },
  };
}
