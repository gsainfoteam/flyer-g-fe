import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/error";
import type { HttpClient, HttpRequest } from "@/shared/api/http-client";
import { createDeviceCredentials } from "@/shared/lib/device-credential";
import { NO_WIDGETS } from "../model/feed";
import { createHttpWidgetRepository } from "./http-widget-repository";

/** flyer-g-be#24 제안의 TV 조회 예시 응답 */
const PROPOSED_RESPONSE = {
  widgetsVersion: "3f9a1c2b7e0d4a51",
  ratioPercent: 25,
  widgets: [
    {
      id: "widget-dday",
      type: "DDAY",
      durationSeconds: 5,
      params: { label: "종강", date: "2026-12-18T15:00:00.000Z" },
    },
    { id: "widget-unknown", type: "BAMBOO", durationSeconds: 10, params: {} },
    { id: 3, type: "FORTUNE" },
  ],
  weather: { fetchedAt: "2026-10-31T02:40:00.000Z", temperature: 14.3, sky: "CLEAR" },
};

function client(respond: (request: HttpRequest) => unknown): HttpClient & { calls: HttpRequest[] } {
  const calls: HttpRequest[] = [];
  return {
    calls,
    request: vi.fn(async (request: HttpRequest) => {
      calls.push(request);
      return respond(request);
    }) as HttpClient["request"],
  };
}

const notFound = () => {
  throw new ApiError({ kind: "http", code: "NOT_FOUND", message: "없음", status: 404 });
};

function setup(deviceRespond: (request: HttpRequest) => unknown, userRespond = deviceRespond) {
  const credentials = createDeviceCredentials(null);
  credentials.save("dev-1", "fgd_token");
  const deviceClient = client(deviceRespond);
  const userClient = client(userRespond);
  return {
    deviceClient,
    userClient,
    repository: createHttpWidgetRepository({ deviceClient, userClient, credentials }),
  };
}

describe("createHttpWidgetRepository", () => {
  it("제안 형식을 읽고, 모르는 종류와 모양이 틀린 항목은 버린다", async () => {
    const { repository, deviceClient } = setup(() => PROPOSED_RESPONSE);
    const feed = await repository.getDeviceWidgets("dev-1");
    expect(feed.version).toBe("3f9a1c2b7e0d4a51");
    expect(feed.ratioPercent).toBe(25);
    expect(feed.widgets.map((slot) => slot.id)).toEqual(["widget-dday"]);
    expect(feed.weather).toMatchObject({ sky: "CLEAR" });
    expect(deviceClient.calls[0]).toMatchObject({
      path: "/signage/devices/dev-1/widgets",
      headers: { "X-Device-Token": "fgd_token" },
    });
  });

  it("서버에 위젯 API가 없으면(404) 위젯 없이 돈다", async () => {
    const { repository } = setup(notFound);
    await expect(repository.getDeviceWidgets("dev-1")).resolves.toEqual(NO_WIDGETS);
  });

  it("토큰이 없거나 미리보기면 부르지 않는다", async () => {
    const { repository, deviceClient } = setup(() => PROPOSED_RESPONSE);
    await expect(repository.getDeviceWidgets("unknown")).resolves.toEqual(NO_WIDGETS);
    await expect(repository.getDeviceWidgets("device-preview")).resolves.toEqual(NO_WIDGETS);
    expect(deviceClient.calls).toHaveLength(0);
  });

  it("304면 지난 응답을 그대로 쓴다", async () => {
    let first = true;
    const { repository } = setup((request) => {
      if (first) {
        first = false;
        request.onResponse?.(new Response(null, { headers: { ETag: '"v1"' } }));
        return PROPOSED_RESPONSE;
      }
      expect(request.headers?.["If-None-Match"]).toBe('"v1"');
      return undefined;
    });
    const before = await repository.getDeviceWidgets("dev-1");
    await expect(repository.getDeviceWidgets("dev-1")).resolves.toBe(before);
  });

  it("설정은 비율과 종류마다 하나씩 읽고, 서버가 없으면 지원하지 않는다고 알린다", async () => {
    const { repository, userClient } = setup(notFound, () => ({
      ratioPercent: 80,
      widgets: [{ type: "WEATHER", enabled: false, durationSeconds: 10, params: {} }],
    }));
    const settings = await repository.getSettings("dev-1");
    expect(settings.ratioPercent).toBe(50);
    expect(settings.widgets).toHaveLength(9);
    expect(settings.widgets.find((item) => item.type === "WEATHER")?.enabled).toBe(false);
    expect(userClient.calls[0]?.path).toBe("/signage/devices/dev-1/widget-settings");

    const missing = setup(notFound).repository;
    await expect(missing.getSettings("dev-1")).rejects.toMatchObject({
      code: "WIDGETS_UNSUPPORTED",
    });
  });
});
