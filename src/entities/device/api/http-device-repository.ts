import type { HttpClient } from "@/shared/api/http-client";
import type { ApiRequestBody } from "@/shared/api/contract";
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
import { readLayoutType } from "@/entities/playlist/model/types";
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
 * 목록은 `{ serverTime, items }` 봉투로 온다. 화면은 이 서버 시각으로 "마지막 연결
 * N분 전"을 센다(클라이언트 시계를 쓰지 않는다).
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

/**
 * 화면 전환 방식의 전송 값. 백엔드는 아직 예전 값(FOUR_GRID·SINGLE)만 받는다.
 * 1:1로 대응하므로 보낼 때 바꾸고, 받을 때는 둘 다 읽는다(`readLayoutType`).
 * 백엔드가 WALL·STRIP을 받으면 이 변환을 지운다.
 * (`docs/API-FOLLOWUP-2026-10-17.md` 1절)
 */
const WIRE_LAYOUT = {
  WALL: "FOUR_GRID",
  STRIP: "SINGLE",
} as const satisfies Record<LayoutType, string>;

function toWireInput<T extends { layout?: LayoutType }>(
  input: T,
): Omit<T, "layout"> & { layout?: (typeof WIRE_LAYOUT)[LayoutType] } {
  const { layout, ...rest } = input;
  return layout === undefined ? rest : { ...rest, layout: WIRE_LAYOUT[layout] };
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
      type: readDeviceLayout(
        readString(layout, "type", at("layout.type")),
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
    // 백엔드에 위젯 설정이 아직 없다. 계약이 생기면 여기서 읽는다.
    widgets: null,
  };
}

function readDeviceLayout(value: string, path: string): LayoutType {
  const type = readLayoutType(value);
  if (type === null) throw invalidResponse(path, "WALL | STRIP");
  return type;
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
      const body = readObject(
        await client.request({ path: "/signage/devices", signal }),
      );
      return {
        items: readArray(body.items, "items").map((item, index) =>
          parseDevice(item, `items[${index}]`),
        ),
        serverTime: readIsoDate(body, "serverTime"),
      };
    },

    async create(input: DeviceInput, signal) {
      return parseDeviceWithToken(
        await client.request({
          method: "POST",
          path: "/signage/devices",
          body: toWireInput(input) satisfies ApiRequestBody<"CreateDeviceDto">,
          signal,
        }),
      );
    },

    async update(id, input: UpdateDeviceInput, signal) {
      // 백엔드에 위젯 설정이 아직 없어 보내지 않는다. 화면은 위젯 설정이 없는
      // 기기(`widgets: null`)에서 위젯 설정을 막는다.
      const { widgets, ...rest } = input;
      void widgets;
      return parseDevice(
        await client.request({
          method: "PATCH",
          path: devicePath(id),
          body: toWireInput(rest) satisfies ApiRequestBody<"UpdateDeviceDto">,
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
