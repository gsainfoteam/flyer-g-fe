/**
 * mock 기기 heartbeat 기록.
 *
 * TV 탭(`/display/:deviceId`)이 보낸 heartbeat를 관리 화면 탭이 읽어 기기를
 * "온라인"으로 보여주기 위한 것이다. mock repository는 탭마다 메모리가 따로라
 * 탭 사이에 공유되는 localStorage에 둔다. 실제로는 서버가 기록한다.
 */
export interface HeartbeatRecord {
  /** ISO UTC */
  at: string;
  appVersion: string;
  resolution: { width: number; height: number };
}

export interface HeartbeatLog {
  read(): Record<string, HeartbeatRecord>;
  record(deviceId: string, entry: HeartbeatRecord): void;
}

const STORAGE_KEY = "flyerg:mock-heartbeats";

export function createStorageHeartbeatLog(): HeartbeatLog {
  const read = (): Record<string, HeartbeatRecord> => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, HeartbeatRecord>)
        : {};
    } catch {
      // 저장소를 못 쓰는 환경이면 기록이 없는 것으로 본다.
      return {};
    }
  };

  return {
    read,
    record(deviceId, entry) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...read(), [deviceId]: entry }),
        );
      } catch {
        // 기록하지 못해도 TV 재생에는 영향이 없다.
      }
    },
  };
}

/** 테스트용. 다른 테스트와 기록을 나누지 않는다. */
export function createMemoryHeartbeatLog(): HeartbeatLog {
  let records: Record<string, HeartbeatRecord> = {};
  return {
    read: () => records,
    record(deviceId, entry) {
      records = { ...records, [deviceId]: entry };
    },
  };
}
