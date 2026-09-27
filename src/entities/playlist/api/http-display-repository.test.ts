import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/error";
import type { HttpClient, HttpRequest } from "@/shared/api/http-client";
import { createDeviceCredentials } from "@/shared/lib/device-credential";
import { PREVIEW_DEVICE_ID } from "../model/types";
import { createHttpDisplayRepository } from "./http-display-repository";

const PLAYLIST = {
  serverTime: "2026-09-27T10:00:00.000Z",
  playlistVersion: "a1b2c3d4e5f60718",
  deviceName: "A동 로비",
  refreshAfterSeconds: 60,
  layout: { type: "FOUR_GRID", rotationSeconds: 10 },
  items: [
    {
      submissionId: "sub_01",
      revision: 3,
      title: "겨울 정기 공연",
      category: "공연",
      assetUrl: "https://cdn.example/asset_01/tv.webp",
      detailUrl: null,
      startsAt: "2026-09-27T00:00:00.000Z",
      endsAt: "2026-10-04T00:00:00.000Z",
      priority: 0,
      checksum: "sha256:ab",
      subtitle: null,
      location: "대강당",
      organizerName: "페이드인",
    },
  ],
};

type Reply = { body?: unknown; etag?: string; status?: number };

function setup(replies: Record<string, (request: HttpRequest) => Reply>) {
  let clock = Date.parse("2026-09-27T10:00:00.000Z");
  const deviceCalls: HttpRequest[] = [];
  const request = async (call: HttpRequest) => {
    deviceCalls.push(call);
    const handler = replies[call.path];
    if (!handler) throw new Error(`예상하지 못한 요청: ${call.path}`);
    const reply = handler(call);
    if (reply.status && reply.status >= 400) {
      throw new ApiError({
        kind: "http",
        code: "UNAUTHENTICATED",
        message: "denied",
        status: reply.status,
      });
    }
    call.onResponse?.(
      new Response(null, {
        status: reply.status === 304 ? 304 : 200,
        headers: reply.etag ? { ETag: reply.etag } : {},
      }),
    );
    return reply.status === 304 ? undefined : reply.body;
  };
  const deviceClient: HttpClient = {
    request: vi.fn(request) as HttpClient["request"],
  };
  const userCalls: HttpRequest[] = [];
  const userClient: HttpClient = {
    request: vi.fn(async (call: HttpRequest) => {
      userCalls.push(call);
      return replies[`user:${call.query?.scope}`]!(call).body;
    }) as HttpClient["request"],
  };
  const credentials = createDeviceCredentials(null);
  const repository = createHttpDisplayRepository({
    deviceClient,
    userClient,
    credentials,
    now: () => clock,
  });
  return {
    repository,
    credentials,
    deviceCalls,
    userCalls,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe("createHttpDisplayRepository", () => {
  it("기기 토큰을 헤더로 싣고, 기기 이름은 편성에서 읽는다", async () => {
    const ctx = setup({
      "/signage/devices/dev_01/playlist": () => ({
        body: PLAYLIST,
        etag: '"a1b2"',
      }),
    });
    ctx.credentials.save("dev_01", "fgd_token");

    const playlist = await ctx.repository.getPlaylist("dev_01");

    expect(playlist).toMatchObject({
      deviceName: "A동 로비",
      playlistVersion: "a1b2c3d4e5f60718",
      layout: { type: "FOUR_GRID", rotationSeconds: 10 },
    });
    expect(playlist.items[0]).toMatchObject({
      detailUrl: null,
      location: "대강당",
    });
    expect(ctx.deviceCalls[0]!.headers).toEqual({
      "X-Device-Token": "fgd_token",
    });
    // 기기 이름을 따로 묻지 않는다.
    expect(ctx.deviceCalls).toHaveLength(1);
  });

  it("받은 ETag로 조건부 요청하고, 304면 편성은 그대로 두고 서버 시각만 옮긴다", async () => {
    const ctx = setup({
      "/signage/devices/dev_01/playlist": (call) =>
        call.headers?.["If-None-Match"]
          ? { status: 304 }
          : { body: PLAYLIST, etag: '"a1b2"' },
    });
    ctx.credentials.save("dev_01", "fgd_token");

    const first = await ctx.repository.getPlaylist("dev_01");
    ctx.advance(60_000);
    const second = await ctx.repository.getPlaylist("dev_01");

    const playlistCalls = ctx.deviceCalls.filter((call) =>
      call.path.endsWith("/playlist"),
    );
    expect(playlistCalls[0]).toMatchObject({ allowNotModified: false });
    expect(playlistCalls[1]).toMatchObject({
      allowNotModified: true,
      headers: { "X-Device-Token": "fgd_token", "If-None-Match": '"a1b2"' },
    });
    expect(second.items).toBe(first.items);
    expect(second.serverTime.getTime() - first.serverTime.getTime()).toBe(
      60_000,
    );
  });

  it("토큰이 없으면 요청하지 않고 기기 연결이 필요하다고 알린다", async () => {
    const ctx = setup({});
    await expect(ctx.repository.getPlaylist("dev_01")).rejects.toMatchObject({
      code: "DEVICE_NOT_REGISTERED",
    });
    expect(ctx.deviceCalls).toHaveLength(0);
  });

  it("토큰이 거절되면 사용자 로그인 만료와 구분되는 code로 알린다", async () => {
    const ctx = setup({
      "/signage/devices/dev_01/playlist": () => ({ status: 401 }),
    });
    ctx.credentials.save("dev_01", "fgd_revoked");

    await expect(ctx.repository.getPlaylist("dev_01")).rejects.toMatchObject({
      code: "DEVICE_UNAUTHORIZED",
      status: 401,
    });
  });

  it("미리보기는 게시 중 신청으로 편성을 만들고, 게시자는 자기 것만 본다", async () => {
    const page = {
      items: [],
      nextCursor: null,
      totalCount: 0,
      serverTime: "2026-09-27T10:00:00.000Z",
    };
    const ctx = setup({
      "user:all": () => {
        throw new ApiError({
          kind: "http",
          code: "FORBIDDEN",
          message: "reviewers only",
          status: 403,
        });
      },
      "user:me": () => ({ body: page }),
    });

    const playlist = await ctx.repository.getPlaylist(PREVIEW_DEVICE_ID);

    expect(ctx.deviceCalls).toHaveLength(0);
    expect(ctx.userCalls.map((call) => call.query)).toEqual([
      { statuses: "PUBLISHED", limit: 100, scope: "all" },
      { statuses: "PUBLISHED", limit: 100, scope: "me" },
    ]);
    expect(playlist).toMatchObject({ deviceName: null, items: [] });
  });
});
