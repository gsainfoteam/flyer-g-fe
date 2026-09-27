import { describe, expect, it, vi } from "vitest";
import type { HttpClient } from "@/shared/api/http-client";
import { createHttpDeviceRepository } from "./http-device-repository";

describe("createHttpDeviceRepository", () => {
  it("배열 응답을 읽고, heartbeat 전의 빈 값은 null로 둔다", async () => {
    const client: HttpClient = {
      request: vi.fn(async () => [
        {
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
        },
      ]) as HttpClient["request"],
    };

    const list = await createHttpDeviceRepository(client).list();

    // 서버 목록에는 시각이 없다. 화면이 다른 응답의 서버 시각을 쓴다.
    expect(list.serverTime).toBeNull();
    expect(list.items).toEqual([
      {
        id: "dev_01",
        name: "A동 로비",
        location: null,
        groupIds: ["grp_a"],
        orientation: "LANDSCAPE",
        resolution: null,
        lastSeenAt: null,
        appVersion: null,
        status: "OFFLINE",
      },
    ]);
  });
});
