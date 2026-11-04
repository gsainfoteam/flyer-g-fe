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
      // 백엔드가 아직 보내는 예전 값은 지금 값으로 바꿔 받는다.
      layout: { type: "WALL", rotationSeconds: 10 },
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

  it("영상 포스터는 재생 파일과 길이를 읽고, 영상 필드가 없으면 이미지로 본다", async () => {
    const video = {
      ...PLAYLIST.items[0]!,
      submissionId: "sub_02",
      kind: "VIDEO",
      width: 1080,
      height: 1920,
      durationMs: 15_000,
      video: { url: "https://cdn.example/asset_02/video.mp4", hasAudio: true },
    };
    const ctx = setup({
      "/signage/devices/dev_01/playlist": () => ({
        body: { ...PLAYLIST, items: [PLAYLIST.items[0], video] },
      }),
    });
    ctx.credentials.save("dev_01", "fgd_token");

    const playlist = await ctx.repository.getPlaylist("dev_01");

    expect(playlist.items[0]).toMatchObject({ kind: "IMAGE", video: null });
    expect(playlist.items[1]).toMatchObject({
      kind: "VIDEO",
      durationMs: 15_000,
      video: { url: "https://cdn.example/asset_02/video.mp4", hasAudio: true },
    });
  });

  it("편성 v2로 요청해 세 종류를 읽고, 모르는 값이 온 건만 뺀다", async () => {
    const ctx = setup({
      "/signage/devices/dev_01/playlist": () => ({
        body: {
          serverTime: PLAYLIST.serverTime,
          timezone: "Asia/Seoul",
          deviceName: "A동 로비",
          playlistVersion: "v2-hash",
          refreshAfterSeconds: 60,
          settings: {
            posterLayout: "STRIP",
            rotationSeconds: 12,
            refreshAfterSeconds: 60,
            infoBar: [],
            quietHours: [],
          },
          blocks: [],
          submissions: {
            POSTER: PLAYLIST.items,
            EVENT_BANNER: [
              {
                submissionId: "sub_e1",
                revision: 2,
                startsAt: "2026-09-27T00:00:00.000Z",
                endsAt: "2026-09-28T00:00:00.000Z",
                checksum: "sha256:e1",
                mode: "TEMPLATE",
                occasion: "BIRTHDAY",
                recipient: "지민",
                message: "생일 축하해!",
                sender: "3층 친구들",
                photoUrl: null,
                assetUrl: null,
                width: 0,
                height: 0,
              },
            ],
            STORY: [
              {
                submissionId: "sub_s1",
                revision: 2,
                startsAt: "2026-09-27T00:00:00.000Z",
                endsAt: "2026-09-29T00:00:00.000Z",
                checksum: "sha256:s1",
                storyNumber: 128,
                tag: "PRAISE",
                body: "고맙습니다",
              },
              {
                submissionId: "sub_s2",
                revision: 1,
                startsAt: "2026-09-27T00:00:00.000Z",
                endsAt: "2026-09-29T00:00:00.000Z",
                checksum: "sha256:s2",
                storyNumber: 129,
                tag: "UNKNOWN_TAG",
                body: "새 말머리",
              },
            ],
          },
          programs: {},
          live: null,
        },
      }),
    });
    ctx.credentials.save("dev_01", "fgd_token");

    const playlist = await ctx.repository.getPlaylist("dev_01");

    expect(ctx.deviceCalls[0]!.query).toEqual({ v: 2 });
    expect(playlist.layout).toEqual({ type: "STRIP", rotationSeconds: 12 });
    expect(playlist.items[0]).toMatchObject({ submissionId: "sub_01" });
    expect(playlist.eventBanners[0]).toMatchObject({
      submissionId: "sub_e1",
      recipient: "지민",
      occasion: "BIRTHDAY",
    });
    expect(playlist.stories.map((story) => story.submissionId)).toEqual([
      "sub_s1",
    ]);
  });

  it("v2를 모르는 서버가 v1으로 답해도 그대로 재생한다", async () => {
    const ctx = setup({
      "/signage/devices/dev_01/playlist": () => ({ body: PLAYLIST }),
    });
    ctx.credentials.save("dev_01", "fgd_token");

    const playlist = await ctx.repository.getPlaylist("dev_01");

    expect(playlist.items).toHaveLength(1);
    expect(playlist).toMatchObject({ eventBanners: [], stories: [] });
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
    // 종류마다 따로 묻는다. 제보가 많아도 포스터가 첫 페이지에서 밀리지 않는다.
    const queries = ctx.userCalls.map((call) => call.query);
    expect(queries).toHaveLength(4);
    expect(queries).toEqual(
      expect.arrayContaining([
        { statuses: "PUBLISHED", type: "POSTER", limit: 100, scope: "all" },
        { statuses: "PUBLISHED", type: "POSTER", limit: 100, scope: "me" },
        {
          statuses: "PUBLISHED",
          type: "EVENT_BANNER,STORY",
          limit: 50,
          scope: "me",
        },
      ]),
    );
    expect(playlist).toMatchObject({
      deviceName: null,
      items: [],
      eventBanners: [],
      stories: [],
    });
  });
});
