import type { KeyValueStore } from "@/shared/storage";
import type { DeviceTelemetryAdapter, PlayEvent } from "@/features/display/api/telemetry-adapter";

/**
 * 노출 이벤트 queue (명세 FR-DASH-03, Phase 06 6절).
 *
 * 오프라인 동안 쌓았다가 batch로 보낸다. 전송 실패는 남겨서 다음에 다시 보내고,
 * 성공은 eventId로 지운다. 서버도 eventId로 중복을 걸러야 한다 — 재시작·재연결로
 * 같은 batch가 두 번 갈 수 있다.
 *
 * 상한이 있다. 몇 주 오프라인이던 기기가 저장 공간을 이벤트로 채우면 정작
 * 미디어 캐시가 밀려난다. 오래된 것부터 버린다.
 *
 * 저장소 읽기·쓰기는 한 번에 하나씩 한다. 4분할은 이벤트 4건이 동시에 들어오고,
 * 전송 중에도 새 이벤트가 쌓인다. 각자 읽고 덮어쓰면 마지막 쓰기만 남는다.
 */
const QUEUE_KEY = "play-events:queue";

export interface PlayEventQueueOptions {
  maxEvents?: number;
  maxAgeMs?: number;
  batchSize?: number;
}

export interface PlayEventQueue {
  enqueue(event: PlayEvent): Promise<void>;
  /** 쌓인 이벤트를 batch로 전송한다. 이미 전송 중이면 아무것도 하지 않는다. */
  flush(adapter: DeviceTelemetryAdapter, deviceId: string): Promise<void>;
  size(): Promise<number>;
}

export function createPlayEventQueue(
  store: KeyValueStore,
  options: PlayEventQueueOptions = {},
): PlayEventQueue {
  const maxEvents = options.maxEvents ?? 500;
  const maxAgeMs = options.maxAgeMs ?? 7 * 24 * 60 * 60 * 1000;
  const batchSize = options.batchSize ?? 50;

  let flushing = false;
  let lock: Promise<unknown> = Promise.resolve();

  /** 저장소를 다루는 작업을 차례로 실행한다. 앞 작업이 실패해도 뒤는 돈다. */
  const exclusive = <T>(task: () => Promise<T>): Promise<T> => {
    const run = lock.then(task, task);
    lock = run.catch(() => undefined);
    return run;
  };

  const read = async (): Promise<PlayEvent[]> =>
    (await store.get<PlayEvent[]>(QUEUE_KEY)) ?? [];

  const trim = (events: PlayEvent[]): PlayEvent[] => {
    const oldest = Date.now() - maxAgeMs;
    const alive = events.filter(
      (event) => new Date(event.startedAt).getTime() >= oldest,
    );
    return alive.slice(Math.max(0, alive.length - maxEvents));
  };

  return {
    async enqueue(event) {
      try {
        await exclusive(async () => {
          await store.set(QUEUE_KEY, trim([...(await read()), event]));
        });
      } catch {
        // 저장 실패로 화면을 멈추지 않는다. 이 이벤트는 잃는다.
      }
    },

    async flush(adapter, deviceId) {
      if (flushing) return;
      flushing = true;
      try {
        for (;;) {
          const batch = await exclusive(async () =>
            trim(await read()).slice(0, batchSize),
          );
          if (batch.length === 0) break;
          // 전송은 잠그지 않는다. 느린 네트워크가 새 이벤트 기록을 막으면 안 된다.
          await adapter.sendPlayEvents(deviceId, batch);
          const sent = new Set(batch.map((event) => event.eventId));
          // 전송하는 동안 들어온 이벤트가 있으니 다시 읽고 보낸 것만 지운다.
          await exclusive(async () => {
            const remaining = (await read()).filter(
              (event) => !sent.has(event.eventId),
            );
            await store.set(QUEUE_KEY, remaining);
          });
        }
      } catch {
        // 남은 이벤트는 다음 flush에 다시 보낸다.
      } finally {
        flushing = false;
      }
    },

    async size() {
      return exclusive(async () => (await read()).length);
    },
  };
}
