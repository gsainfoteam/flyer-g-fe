import { useCallback, useEffect, useRef, useState } from "react";
import { APP_VERSION } from "@/shared/config/app-version";
import { getAppEnv } from "@/shared/config/env";
import type { KeyValueStore } from "@/shared/storage";
import {
  createIndexedDbStore,
  createMemoryStore,
  isIndexedDbAvailable,
} from "@/shared/storage";
import { createTelemetryAdapter } from "@/features/display/api/telemetry-adapter";
import type { DeviceTelemetryAdapter } from "@/features/display/api/telemetry-adapter";
import { createPlayEventQueue } from "@/features/display/model/play-event-queue";

/**
 * 기기 상태 보고와 노출 이벤트 기록 (명세 FR-PLY-08, FR-DASH-03).
 *
 * 어느 쪽도 실패가 화면을 중단시키지 않는다. heartbeat는 최신 상태 하나만 의미가
 * 있으므로 queue 없이 실패를 버리고, 노출 이벤트는 집계용이라 queue에 쌓았다가
 * 재전송한다.
 */
const HEARTBEAT_INTERVAL_MS = 60_000;
const FLUSH_INTERVAL_MS = 30_000;
const TELEMETRY_DB_NAME = "flyer-g-telemetry";

export interface ExposureInput {
  submissionId: string;
  revision?: number | null;
  startedAt: Date;
  durationMs: number;
  completed: boolean;
}

export interface UseDeviceTelemetryOptions {
  adapter?: DeviceTelemetryAdapter;
  store?: KeyValueStore;
  enabled?: boolean;
}

export function useDeviceTelemetry(
  deviceId: string,
  playlistVersion: string | null,
  options: UseDeviceTelemetryOptions = {},
) {
  const { enabled = true } = options;

  const [adapter] = useState<DeviceTelemetryAdapter>(
    () => options.adapter ?? createTelemetryAdapter(getAppEnv()),
  );
  const [queue] = useState(() =>
    createPlayEventQueue(
      options.store ??
        (isIndexedDbAvailable()
          ? createIndexedDbStore(TELEMETRY_DB_NAME)
          : createMemoryStore()),
    ),
  );
  /** 플레이어 세션 하나. 재시작으로 인한 과다 집계를 줄인다. */
  const [sessionId] = useState(() => crypto.randomUUID());

  const lastRenderOkAtRef = useRef<string | null>(null);
  const playlistVersionRef = useRef<string | null>(null);
  useEffect(() => {
    playlistVersionRef.current = playlistVersion;
  }, [playlistVersion]);

  /** 화면을 정상적으로 그렸을 때 호출한다. heartbeat에 실린다. */
  const reportRenderOk = useCallback(() => {
    lastRenderOkAtRef.current = new Date().toISOString();
  }, []);

  /** 포스터가 실제 화면에 표시를 마쳤을 때 호출한다. */
  const recordExposure = useCallback(
    (exposure: ExposureInput) => {
      if (!enabled) return;
      void queue.enqueue({
        eventId: crypto.randomUUID(),
        sessionId,
        submissionId: exposure.submissionId,
        revision: exposure.revision ?? null,
        startedAt: exposure.startedAt.toISOString(),
        durationMs: Math.max(0, Math.round(exposure.durationMs)),
        completed: exposure.completed,
      });
    },
    [enabled, queue, sessionId],
  );

  useEffect(() => {
    if (!enabled) return;

    const sendHeartbeat = () => {
      void adapter
        .sendHeartbeat(deviceId, {
          appVersion: APP_VERSION,
          playlistVersion: playlistVersionRef.current,
          lastRenderOkAt: lastRenderOkAtRef.current,
          resolution: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        })
        .catch(() => {
          // heartbeat 실패는 버린다. 최신 상태만 의미가 있다.
        });
    };
    const flushEvents = () => void queue.flush(adapter, deviceId);

    sendHeartbeat();
    flushEvents();
    const heartbeatId = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    const flushId = window.setInterval(flushEvents, FLUSH_INTERVAL_MS);

    // 네트워크가 돌아오면 쌓인 이벤트를 바로 보낸다.
    window.addEventListener("online", flushEvents);

    return () => {
      window.clearInterval(heartbeatId);
      window.clearInterval(flushId);
      window.removeEventListener("online", flushEvents);
    };
  }, [enabled, adapter, queue, deviceId]);

  return { reportRenderOk, recordExposure, sessionId };
}
