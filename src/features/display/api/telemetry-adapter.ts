import { createStorageHeartbeatLog } from "@/mocks/heartbeats";
import type { HeartbeatLog } from "@/mocks/heartbeats";
import { ApiError } from "@/shared/api/error";
import { createHttpClient } from "@/shared/api/http-client";
import type { HttpClient } from "@/shared/api/http-client";
import { isMockUnit } from "@/shared/config/env";
import type { AppEnv } from "@/shared/config/env";
import { deviceCredentials } from "@/shared/lib/device-credential";
import type { DeviceCredentials } from "@/shared/lib/device-credential";

/**
 * 기기 상태·노출 이벤트 전송 경계 (명세 FR-PLY-08, FR-DASH-03).
 *
 * 실제 전송은 `createHttpTelemetryAdapter`, 개발용은 `createMockTelemetryAdapter`다.
 *
 * 이름은 "노출 이벤트"다. 디스플레이가 정상 렌더링한 횟수이지 사람이 본 횟수가
 * 아니며, 그렇게 표현해서도 안 된다. 개인정보·화면 캡처는 어떤 구현에서도
 * 보내지 않는다.
 */
export interface HeartbeatPayload {
  appVersion: string;
  playlistVersion: string | null;
  /** 마지막으로 화면을 정상적으로 그린 시각 (ISO) */
  lastRenderOkAt: string | null;
  resolution: { width: number; height: number };
}

export interface PlayEvent {
  /** 중복 전송을 걸러내는 식별자 */
  eventId: string;
  /** 플레이어 세션. 재시작으로 인한 과다 집계를 줄인다. */
  sessionId: string;
  submissionId: string;
  revision: number | null;
  startedAt: string;
  durationMs: number;
  completed: boolean;
}

export interface DeviceTelemetryAdapter {
  /** 실패는 던져도 된다. 호출부는 무시하고 화면을 계속 그린다. */
  sendHeartbeat(deviceId: string, payload: HeartbeatPayload): Promise<void>;
  /** batch 전송. 성공하면 보낸 이벤트를 queue에서 지운다. */
  sendPlayEvents(deviceId: string, events: PlayEvent[]): Promise<void>;
}

/**
 * 개발용. heartbeat는 mock 기기 목록이 읽는 기록에 남겨, TV 탭을 열어 둔 기기가
 * 관리 화면에서 온라인으로 보이게 한다. 노출 이벤트는 보내지 않고 성공으로 친다.
 */
export function createMockTelemetryAdapter(
  heartbeats: HeartbeatLog = createStorageHeartbeatLog(),
): DeviceTelemetryAdapter {
  return {
    async sendHeartbeat(deviceId, payload) {
      heartbeats.record(deviceId, {
        at: new Date().toISOString(),
        appVersion: payload.appVersion,
        resolution: payload.resolution,
      });
    },
    async sendPlayEvents() {},
  };
}

/**
 * 실제 전송 (`API-CHANGES-BACKEND.md` 9절). 기기 토큰(`X-Device-Token`)으로 보낸다.
 *
 * - heartbeat: `POST /signage/devices/{id}/heartbeat` → 204
 * - 노출 이벤트: `POST /signage/devices/{id}/play-events` → 200 `{ accepted, duplicates }`.
 *   서버는 한 번에 300개까지 받는다. queue가 50개씩 보내므로 넘지 않는다.
 *
 * 토큰이 없으면 던진다. heartbeat는 버려지고, 노출 이벤트는 queue에 남아 토큰이
 * 생긴 뒤 보낸다.
 */
export const PLAY_EVENTS_MAX_BATCH = 300;

export function createHttpTelemetryAdapter({
  client,
  credentials,
}: {
  client: HttpClient;
  credentials: DeviceCredentials;
}): DeviceTelemetryAdapter {
  const authOf = (deviceId: string) => {
    const token = credentials.get(deviceId);
    if (token === null) {
      throw new ApiError({
        kind: "unknown",
        code: "DEVICE_NOT_REGISTERED",
        message: "이 기기의 토큰이 없습니다.",
      });
    }
    return { "X-Device-Token": token };
  };
  const path = (deviceId: string) =>
    `/signage/devices/${encodeURIComponent(deviceId)}`;

  return {
    async sendHeartbeat(deviceId, payload) {
      await client.request({
        method: "POST",
        path: `${path(deviceId)}/heartbeat`,
        headers: authOf(deviceId),
        body: payload,
      });
    },
    async sendPlayEvents(deviceId, events) {
      const headers = authOf(deviceId);
      for (
        let start = 0;
        start < events.length;
        start += PLAY_EVENTS_MAX_BATCH
      ) {
        await client.request({
          method: "POST",
          path: `${path(deviceId)}/play-events`,
          headers,
          body: { events: events.slice(start, start + PLAY_EVENTS_MAX_BATCH) },
        });
      }
    },
  };
}

/** 환경에 맞는 전송 구현을 고른다. (`VITE_API_MODE_DISPLAY`) */
export function createTelemetryAdapter(env: AppEnv): DeviceTelemetryAdapter {
  if (isMockUnit(env, "display")) {
    return createMockTelemetryAdapter();
  }
  if (env.apiBaseUrl === null) {
    throw new Error("실제 기기 상태 보고에는 API 주소가 필요합니다.");
  }
  return createHttpTelemetryAdapter({
    // 기기 요청은 사용자 세션과 무관하다. 인증 헤더를 싣지 않는 client를 쓴다.
    client: createHttpClient({ baseUrl: env.apiBaseUrl }),
    credentials: deviceCredentials,
  });
}
