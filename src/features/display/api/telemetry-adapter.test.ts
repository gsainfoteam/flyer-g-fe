import { describe, expect, it, vi } from "vitest";
import type { HttpClient, HttpRequest } from "@/shared/api/http-client";
import { createDeviceCredentials } from "@/shared/lib/device-credential";
import { createHttpTelemetryAdapter } from "./telemetry-adapter";
import type { PlayEvent } from "./telemetry-adapter";

function setup(token: string | null = "fgd_token") {
  const calls: HttpRequest[] = [];
  const client: HttpClient = {
    request: vi.fn(async (call: HttpRequest) => {
      calls.push(call);
      return undefined;
    }) as HttpClient["request"],
  };
  const credentials = createDeviceCredentials(null);
  if (token) credentials.save("dev_01", token);
  return {
    adapter: createHttpTelemetryAdapter({ client, credentials }),
    calls,
  };
}

const event = (index: number): PlayEvent => ({
  eventId: `evt-${index}`,
  sessionId: "ses-1",
  submissionId: "sub_01",
  revision: 1,
  startedAt: "2026-09-27T10:00:00.000Z",
  durationMs: 10_000,
  completed: true,
});

describe("createHttpTelemetryAdapter", () => {
  it("heartbeat를 기기 토큰으로 보낸다", async () => {
    const { adapter, calls } = setup();
    const payload = {
      appVersion: "v0.0.0+build",
      playlistVersion: null,
      lastRenderOkAt: null,
      resolution: { width: 1920, height: 1080 },
    };

    await adapter.sendHeartbeat("dev_01", payload);

    expect(calls[0]).toMatchObject({
      method: "POST",
      path: "/signage/devices/dev_01/heartbeat",
      headers: { "X-Device-Token": "fgd_token" },
      body: payload,
    });
  });

  it("노출 이벤트는 서버 한도(300개)씩 나눠 보낸다", async () => {
    const { adapter, calls } = setup();

    await adapter.sendPlayEvents(
      "dev_01",
      Array.from({ length: 650 }, (_, index) => event(index)),
    );

    expect(
      calls.map((call) => (call.body as { events: unknown[] }).events.length),
    ).toEqual([300, 300, 50]);
  });

  it("토큰이 없으면 보내지 않고 던진다. 이벤트는 queue에 남는다", async () => {
    const { adapter, calls } = setup(null);

    await expect(
      adapter.sendPlayEvents("dev_01", [event(1)]),
    ).rejects.toMatchObject({
      code: "DEVICE_NOT_REGISTERED",
    });
    expect(calls).toHaveLength(0);
  });
});
