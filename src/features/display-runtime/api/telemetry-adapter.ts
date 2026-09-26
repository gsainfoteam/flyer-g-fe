import { createStorageHeartbeatLog } from "@/mocks/heartbeats";
import type { HeartbeatLog } from "@/mocks/heartbeats";
import type { AppEnv } from "@/shared/config/env";

/**
 * 기기 상태·노출 이벤트 전송 경계 (명세 FR-PLY-08, FR-DASH-03).
 *
 * 수신 서버가 아직 없다(`API-REQUIREMENTS.md` 9절). 실제 계약이 생기면 구현체만
 * 바꾼다.
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
 * 상태 보고는 재생에 필요한 기능이 아니다. 수신 서버가 없는 환경에서도 플레이어는
 * 떠야 하므로 던지지 않고 아무것도 보내지 않는 구현으로 대신한다.
 */
export function createTelemetryAdapter(env: AppEnv): DeviceTelemetryAdapter {
  if (env.useMockApi) {
    return createMockTelemetryAdapter();
  }
  // TODO(Phase 08): API-REQUIREMENTS.md 9절 계약이 정해지면 실제 전송으로 바꾼다.
  console.warn("기기 상태 보고 서버가 아직 연결되지 않아 보고를 건너뜁니다.");
  return {
    async sendHeartbeat() {},
    async sendPlayEvents() {},
  };
}
