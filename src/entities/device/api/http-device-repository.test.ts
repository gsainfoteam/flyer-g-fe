import { describe, expect, it, vi } from "vitest";
import type { HttpClient, HttpRequest } from "@/shared/api/http-client";
import { createHttpDeviceRepository } from "./http-device-repository";

/** Swagger `DeviceDto` 예시 모양. heartbeat를 받기 전이라 빈 값이 많다. */
const DEVICE = {
  id: "dev_01",
  name: "A동 로비",
  location: null,
  groupIds: ["grp_a"],
  orientation: "LANDSCAPE",
  resolution: null,
  lastSeenAt: null,
  appVersion: null,
  lastPlaylistVersion: null,
  lastRenderOkAt: null,
  status: "OFFLINE",
  layout: { type: "FOUR_GRID", rotationSeconds: 10 },
  refreshAfterSeconds: 60,
  tokenIssuedAt: "2026-09-27T09:00:00.000Z",
  createdAt: "2026-09-27T09:00:00.000Z",
  updatedAt: "2026-09-27T09:00:00.000Z",
};

function fakeClient(response: unknown) {
  const calls: HttpRequest[] = [];
  const client: HttpClient = {
    request: vi.fn(async (call: HttpRequest) => {
      calls.push(call);
      return response;
    }) as HttpClient["request"],
  };
  return { repository: createHttpDeviceRepository(client), calls };
}

describe("createHttpDeviceRepository", () => {
  it("배열 응답을 읽고, heartbeat 전의 빈 값은 null로 둔다", async () => {
    const { repository } = fakeClient({
      serverTime: "2026-09-27T09:30:00.000Z",
      items: [DEVICE],
    });

    const list = await repository.list();

    expect(list.serverTime).toEqual(new Date("2026-09-27T09:30:00.000Z"));
    expect(list.items[0]).toEqual({
      id: "dev_01",
      name: "A동 로비",
      location: null,
      groupIds: ["grp_a"],
      orientation: "LANDSCAPE",
      resolution: null,
      lastSeenAt: null,
      appVersion: null,
      status: "OFFLINE",
      layout: { type: "FOUR_GRID", rotationSeconds: 10 },
      refreshAfterSeconds: 60,
      lastPlaylistVersion: null,
      lastRenderOkAt: null,
      tokenIssuedAt: new Date("2026-09-27T09:00:00.000Z"),
    });
  });

  it("등록은 입력을 그대로 보내고 기기와 토큰을 함께 받는다", async () => {
    const { repository, calls } = fakeClient({ ...DEVICE, token: "fgd_new" });
    const input = {
      name: "A동 로비",
      location: null,
      groupIds: ["grp_a"],
      orientation: "LANDSCAPE" as const,
      layout: "FOUR_GRID" as const,
      rotationSeconds: 10,
      refreshAfterSeconds: 60,
    };

    const result = await repository.create(input);

    expect(calls[0]).toMatchObject({
      method: "POST",
      path: "/signage/devices",
      body: input,
    });
    expect(result.token).toBe("fgd_new");
    expect(result.device.id).toBe("dev_01");
  });

  it("수정과 토큰 재발급 경로를 쓴다", async () => {
    const { repository, calls } = fakeClient({
      ...DEVICE,
      token: "fgd_rotated",
    });

    await repository.update("dev_01", { isActive: false });
    const rotated = await repository.rotateToken("dev_01");

    expect(calls[0]).toMatchObject({
      method: "PATCH",
      path: "/signage/devices/dev_01",
      body: { isActive: false },
    });
    expect(calls[1]).toMatchObject({
      method: "POST",
      path: "/signage/devices/dev_01/rotate-token",
    });
    expect(rotated.token).toBe("fgd_rotated");
  });
});
