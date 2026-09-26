import { describe, expect, it, vi } from "vitest";
import { createMemoryStore } from "@/shared/storage";
import type { PlayEvent } from "../api/telemetry-adapter";
import { createPlayEventQueue } from "./play-event-queue";

function event(id: string, startedAt = new Date()): PlayEvent {
  return {
    eventId: id,
    sessionId: "session-1",
    submissionId: `sub-${id}`,
    revision: 1,
    startedAt: startedAt.toISOString(),
    durationMs: 10_000,
    completed: true,
  };
}

describe("createPlayEventQueue", () => {
  it("쌓인 이벤트를 batch로 보내고 성공분을 지운다", async () => {
    const queue = createPlayEventQueue(createMemoryStore(), { batchSize: 2 });
    await queue.enqueue(event("a"));
    await queue.enqueue(event("b"));
    await queue.enqueue(event("c"));

    const sent: PlayEvent[][] = [];
    await queue.flush(
      {
        sendHeartbeat: async () => {},
        sendPlayEvents: async (_deviceId, events) => {
          sent.push(events);
        },
      },
      "device-1",
    );

    expect(sent.map((batch) => batch.length)).toEqual([2, 1]);
    expect(await queue.size()).toBe(0);
  });

  it("전송 실패분은 남겨서 다음에 다시 보낸다", async () => {
    const queue = createPlayEventQueue(createMemoryStore());
    await queue.enqueue(event("a"));

    await queue.flush(
      {
        sendHeartbeat: async () => {},
        sendPlayEvents: async () => {
          throw new Error("offline");
        },
      },
      "device-1",
    );
    expect(await queue.size()).toBe(1);

    const sent: PlayEvent[] = [];
    await queue.flush(
      {
        sendHeartbeat: async () => {},
        sendPlayEvents: async (_deviceId, events) => {
          sent.push(...events);
        },
      },
      "device-1",
    );
    expect(sent.map((item) => item.eventId)).toEqual(["a"]);
    expect(await queue.size()).toBe(0);
  });

  it("최대 개수를 넘으면 오래된 것부터 버린다", async () => {
    const queue = createPlayEventQueue(createMemoryStore(), { maxEvents: 3 });
    for (const id of ["a", "b", "c", "d"]) {
      await queue.enqueue(event(id));
    }
    expect(await queue.size()).toBe(3);

    const sent: PlayEvent[] = [];
    await queue.flush(
      {
        sendHeartbeat: async () => {},
        sendPlayEvents: async (_deviceId, events) => {
          sent.push(...events);
        },
      },
      "device-1",
    );
    expect(sent.map((item) => item.eventId)).toEqual(["b", "c", "d"]);
  });

  it("보관 기간이 지난 이벤트는 버린다", async () => {
    const queue = createPlayEventQueue(createMemoryStore(), {
      maxAgeMs: 60_000,
    });
    await queue.enqueue(event("old", new Date(Date.now() - 120_000)));
    await queue.enqueue(event("fresh"));
    expect(await queue.size()).toBe(1);
  });

  it("동시 flush는 한 번만 실행된다", async () => {
    const queue = createPlayEventQueue(createMemoryStore());
    await queue.enqueue(event("a"));

    const send = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const adapter = { sendHeartbeat: async () => {}, sendPlayEvents: send };

    await Promise.all([
      queue.flush(adapter, "device-1"),
      queue.flush(adapter, "device-1"),
    ]);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("동시에 들어온 이벤트를 하나도 잃지 않는다", async () => {
    const queue = createPlayEventQueue(createMemoryStore());

    // 4분할은 한 페이지의 이벤트 4건을 동시에 기록한다.
    await Promise.all(["a", "b", "c", "d"].map((id) => queue.enqueue(event(id))));

    expect(await queue.size()).toBe(4);
  });

  it("전송하는 동안 들어온 이벤트는 지우지 않는다", async () => {
    const queue = createPlayEventQueue(createMemoryStore());
    await queue.enqueue(event("a"));

    let release!: () => void;
    const sendPlayEvents = vi.fn(
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    const flushing = queue.flush({ sendHeartbeat: vi.fn(), sendPlayEvents }, "device-1");
    await vi.waitFor(() => expect(sendPlayEvents).toHaveBeenCalledTimes(1));

    await queue.enqueue(event("b"));
    release();
    await vi.waitFor(() => expect(sendPlayEvents).toHaveBeenCalledTimes(2));
    release();
    await flushing;

    const sent = sendPlayEvents.mock.calls.flatMap(
      (call) => (call as unknown as [string, PlayEvent[]])[1],
    );
    expect(sent.map((item) => item.eventId)).toEqual(["a", "b"]);
    expect(await queue.size()).toBe(0);
  });
});

