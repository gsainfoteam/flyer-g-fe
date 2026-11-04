import { describe, expect, it, vi } from "vitest";
import type { HttpClient, HttpRequest } from "@/shared/api/http-client";
import { createHttpSubmissionRepository } from "./http-submission-repository";

/** Swagger `SubmissionDto` 예시 모양 */
const SUBMISSION = {
  id: "sub_01",
  ziggleNoticeId: "1041",
  requesterId: "user_01",
  requesterName: "홍길동",
  type: "POSTER",
  title: "겨울 정기 공연",
  categoryId: "performance",
  categoryName: "공연",
  assetId: "asset_01",
  posterUrl: "https://cdn.example/asset_01/preview.webp",
  posterThumbUrl: "https://cdn.example/asset_01/thumb.webp",
  posterWidth: 1536,
  posterHeight: 2048,
  detailUrl: "https://ziggle.gistory.me/notice/1041",
  startAt: "2026-10-01T00:00:00.000Z",
  endAt: "2026-10-08T09:00:00.000Z",
  status: "PENDING_REVIEW",
  priority: 0,
  targetGroupIds: [],
  organizerName: "페이드인",
  subtitle: null,
  location: "대강당",
  description: null,
  version: 1,
  submittedAt: "2026-09-27T06:00:00.000Z",
  createdAt: "2026-09-27T06:00:00.000Z",
  updatedAt: "2026-09-27T06:00:00.000Z",
};

function fakeClient(response: unknown) {
  const calls: HttpRequest[] = [];
  const client: HttpClient = {
    request: vi.fn(async (request: HttpRequest) => {
      calls.push(request);
      return response;
    }) as HttpClient["request"],
  };
  return { repository: createHttpSubmissionRepository(client), calls };
}

describe("createHttpSubmissionRepository", () => {
  it("목록은 상태를 쉼표로 묶어 보내고 봉투를 도메인 모델로 옮긴다", async () => {
    const { repository, calls } = fakeClient({
      items: [SUBMISSION],
      nextCursor: "cursor-2",
      totalCount: 11,
      serverTime: "2026-09-27T07:00:00.000Z",
    });

    const page = await repository.list({
      scope: "all",
      statuses: ["APPROVED", "SCHEDULED"],
      limit: 10,
    });

    expect(calls[0]).toMatchObject({
      path: "/signage/submissions",
      query: { scope: "all", statuses: "APPROVED,SCHEDULED", limit: 10 },
    });
    expect(page.nextCursor).toBe("cursor-2");
    expect(page.serverTime).toEqual(new Date("2026-09-27T07:00:00.000Z"));
    expect(page.items[0]).toMatchObject({
      id: "sub_01",
      organizerName: "페이드인",
      subtitle: null,
      posterWidth: 1536,
      posterHeight: 2048,
      startAt: new Date("2026-10-01T00:00:00.000Z"),
      submittedAt: new Date("2026-09-27T06:00:00.000Z"),
    });
  });

  it("상태 하나로 부르면 그 상태만, 전체면 필터 없이 보낸다", async () => {
    const page = {
      items: [],
      nextCursor: null,
      totalCount: 0,
      serverTime: "2026-09-27T07:00:00.000Z",
    };
    const { repository, calls } = fakeClient(page);

    await repository.list({ status: "PUBLISHED", limit: 4 });
    await repository.list({ status: "ALL" });

    expect(calls[0]!.query).toMatchObject({
      scope: "me",
      statuses: "PUBLISHED",
    });
    expect(calls[1]!.query?.statuses).toBeUndefined();
  });

  it("생성은 날짜를 UTC ISO로 보내고 idempotency key를 싣는다", async () => {
    const { repository, calls } = fakeClient(SUBMISSION);

    await repository.create(
      {
        title: "겨울 정기 공연",
        categoryId: "performance",
        assetId: "asset_01",
        detailUrl: null,
        organizerName: "페이드인",
        subtitle: null,
        location: null,
        description: null,
        startAt: new Date("2026-10-01T00:00:00.000Z"),
        endAt: new Date("2026-10-08T09:00:00.000Z"),
        targetGroupIds: [],
      },
      { idempotencyKey: "3f2a1c9e-7b5d-4e21-9a0c-1d8e5f6b2c34" },
    );

    expect(calls[0]).toMatchObject({
      method: "POST",
      path: "/signage/submissions",
      idempotencyKey: "3f2a1c9e-7b5d-4e21-9a0c-1d8e5f6b2c34",
      body: {
        detailUrl: null,
        startAt: "2026-10-01T00:00:00.000Z",
        endAt: "2026-10-08T09:00:00.000Z",
      },
    });
  });

  it("수정은 보낸 필드만 싣고, null은 비우라는 뜻으로 그대로 보낸다", async () => {
    const { repository, calls } = fakeClient(SUBMISSION);

    await repository.update("sub_01", { location: null, version: 3 });

    expect(calls[0]).toMatchObject({
      method: "PATCH",
      path: "/signage/submissions/sub_01",
    });
    expect(calls[0]!.body).toEqual({ location: null, version: 3 });
  });

  it("재검토 요청과 취소는 버전과 Idempotency-Key를 싣는다", async () => {
    const { repository, calls } = fakeClient(SUBMISSION);

    await repository.submit(
      "sub_01",
      { version: 2 },
      { idempotencyKey: "key-1" },
    );
    await repository.cancel(
      "sub_01",
      { version: 3 },
      { idempotencyKey: "key-2" },
    );

    expect(calls[0]).toMatchObject({
      method: "POST",
      path: "/signage/submissions/sub_01/submit",
      body: { version: 2 },
      idempotencyKey: "key-1",
    });
    expect(calls[1]).toMatchObject({
      method: "POST",
      path: "/signage/submissions/sub_01/cancel",
      body: { version: 3 },
      idempotencyKey: "key-2",
    });
  });

  it("요약은 10개 상태의 건수를 모두 받는다", async () => {
    const byStatus = {
      DRAFT: 0,
      PENDING_REVIEW: 3,
      REJECTED: 1,
      APPROVED: 0,
      SCHEDULED: 5,
      PUBLISHED: 7,
      ENDED: 27,
      SUSPENDED: 0,
      CANCELED: 2,
      ARCHIVED: 4,
    };
    const { repository, calls } = fakeClient({
      calculatedAt: "2026-09-27T07:00:00.000Z",
      total: 45,
      published: 7,
      scheduled: 5,
      pendingReview: 3,
      ended: 27,
      byStatus,
    });

    const summary = await repository.getSummary({ scope: "all" });

    expect(calls[0]).toMatchObject({
      path: "/signage/submissions/summary",
      query: { scope: "all" },
    });
    expect(summary.byStatus).toEqual(byStatus);
    expect(summary.calculatedAt).toEqual(new Date("2026-09-27T07:00:00.000Z"));
  });

  it("모르는 상태나 offset 없는 시각이 오면 어느 항목인지 알리며 멈춘다", async () => {
    await expect(
      fakeClient({ ...SUBMISSION, status: "HIDDEN" }).repository.getById(
        "sub_01",
      ),
    ).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      message: expect.stringContaining("신청.status"),
    });
    await expect(
      fakeClient({
        items: [{ ...SUBMISSION, startAt: "2026-10-01T00:00:00" }],
        nextCursor: null,
        totalCount: 1,
        serverTime: "2026-09-27T07:00:00.000Z",
      }).repository.list({}),
    ).rejects.toMatchObject({
      message: expect.stringContaining("items[0].startAt"),
    });
  });

  it("최근 검토 결정은 아직 오지 않으면 null이고, 오면 알려진 값만 받는다", async () => {
    expect(
      (await fakeClient(SUBMISSION).repository.getById("sub_01")).lastDecision,
    ).toBeNull();
    expect(
      (
        await fakeClient({
          ...SUBMISSION,
          lastDecision: "REJECTED",
        }).repository.getById("sub_01")
      ).lastDecision,
    ).toBe("REJECTED");
    await expect(
      fakeClient({ ...SUBMISSION, lastDecision: "HOLD" }).repository.getById(
        "sub_01",
      ),
    ).rejects.toMatchObject({
      message: expect.stringContaining("신청.lastDecision"),
    });
  });

  describe("신청 종류 (배포 ②③④)", () => {
    /** 포스터가 아닌 종류는 포스터 필드가 비어 온다. */
    const notPoster = {
      ...SUBMISSION,
      ziggleNoticeId: null,
      categoryId: null,
      categoryName: null,
      assetId: null,
      posterUrl: null,
      posterThumbUrl: null,
      posterKind: null,
      posterWidth: null,
      posterHeight: null,
      posterDurationMs: null,
      posterVideoUrl: null,
      detailUrl: null,
      organizerName: null,
      location: null,
    };

    it("이벤트 배너를 읽는다", async () => {
      const banner = await fakeClient({
        ...notPoster,
        type: "EVENT_BANNER",
        title: "생일 · 지민에게",
        eventBanner: {
          mode: "TEMPLATE",
          occasion: "BIRTHDAY",
          recipient: "지민",
          message: "스물한 살 생일 축하해!",
          sender: "3층 친구들",
          photoAssetId: null,
          photoUrl: null,
          photoConsent: false,
          assetId: null,
          assetUrl: null,
        },
        story: null,
      }).repository.getById("sub_01");

      expect(banner).toMatchObject({
        type: "EVENT_BANNER",
        categoryName: null,
        posterUrl: null,
        posterWidth: null,
        story: null,
        eventBanner: {
          mode: "TEMPLATE",
          occasion: "BIRTHDAY",
          recipient: "지민",
          sender: "3층 친구들",
          photoConsent: false,
        },
      });
    });

    it("승인 전 제보는 기간이 없고, 작성자 본인이 아니면 신청자가 비어 온다", async () => {
      const story = await fakeClient({
        ...notPoster,
        type: "STORY",
        title: "B동 3층 세탁실 건조기 2번이 고쳐졌어요.",
        requesterId: null,
        requesterName: null,
        startAt: null,
        endAt: null,
        eventBanner: null,
        story: {
          tag: "PRAISE",
          body: "B동 3층 세탁실 건조기 2번이 고쳐졌어요.",
          storyNumber: null,
        },
      }).repository.getById("sub_01");

      expect(story).toMatchObject({
        type: "STORY",
        requesterId: null,
        requesterName: null,
        startAt: null,
        endAt: null,
        story: { tag: "PRAISE", storyNumber: null },
      });
    });

    it("영상 포스터의 길이와 재생 주소를 읽는다", async () => {
      const video = await fakeClient({
        ...SUBMISSION,
        posterKind: "VIDEO",
        posterDurationMs: 12000,
        posterVideoUrl: "https://cdn.example/asset_01/play.mp4",
      }).repository.getById("sub_01");

      expect(video).toMatchObject({
        posterKind: "VIDEO",
        posterDurationMs: 12000,
        posterVideoUrl: "https://cdn.example/asset_01/play.mp4",
      });
    });

    it("모르는 종류는 응답 오류로 멈춘다", async () => {
      await expect(
        fakeClient({ ...SUBMISSION, type: "GAME" }).repository.getById(
          "sub_01",
        ),
      ).rejects.toMatchObject({
        message: expect.stringContaining("신청.type"),
      });
    });

    it("목록은 종류 필터를 type으로 보낸다", async () => {
      const { repository, calls } = fakeClient({
        items: [],
        nextCursor: null,
        totalCount: 0,
        serverTime: "2026-11-01T00:00:00.000Z",
      });

      await repository.list({ types: ["POSTER", "STORY"] });
      await repository.list({ types: [] });

      expect(calls[0]!.query).toMatchObject({ type: "POSTER,STORY" });
      expect(calls[1]!.query!.type).toBeUndefined();
    });
  });

  describe("종류별 검토 대기 요약", () => {
    const base = {
      calculatedAt: "2026-11-01T00:00:00.000Z",
      total: 4,
      published: 0,
      scheduled: 0,
      pendingReview: 4,
      ended: 0,
      byStatus: {
        DRAFT: 0,
        PENDING_REVIEW: 4,
        REJECTED: 0,
        APPROVED: 0,
        SCHEDULED: 0,
        PUBLISHED: 0,
        ENDED: 0,
        SUSPENDED: 0,
        CANCELED: 0,
        ARCHIVED: 0,
      },
    };

    it("byType을 읽는다", async () => {
      const summary = await fakeClient({
        ...base,
        byType: {
          POSTER: {
            pendingReview: 3,
            oldestSubmittedAt: "2026-10-30T02:10:00.000Z",
          },
          EVENT_BANNER: {
            pendingReview: 1,
            oldestSubmittedAt: "2026-10-31T09:00:00.000Z",
          },
          STORY: { pendingReview: 0, oldestSubmittedAt: null },
        },
      }).repository.getSummary({ scope: "all" });

      expect(summary.byType).toEqual({
        POSTER: {
          pendingReview: 3,
          oldestSubmittedAt: new Date("2026-10-30T02:10:00.000Z"),
        },
        EVENT_BANNER: {
          pendingReview: 1,
          oldestSubmittedAt: new Date("2026-10-31T09:00:00.000Z"),
        },
        STORY: { pendingReview: 0, oldestSubmittedAt: null },
      });
    });

    it("byType이 없는 옛 서버는 대기 전체를 포스터로 본다", async () => {
      const summary = await fakeClient(base).repository.getSummary({
        scope: "all",
      });

      expect(summary.byType).toEqual({
        POSTER: { pendingReview: 4, oldestSubmittedAt: null },
        EVENT_BANNER: { pendingReview: 0, oldestSubmittedAt: null },
        STORY: { pendingReview: 0, oldestSubmittedAt: null },
      });
    });
  });

  it("제보 작성자 열람은 POST로 부르고 이름·메일을 읽는다", async () => {
    const { repository, calls } = fakeClient({
      requesterId: "user_09",
      requesterName: "박제보",
      requesterEmail: "park@gm.gist.ac.kr",
    });

    await expect(repository.revealAuthor("sub_09")).resolves.toEqual({
      requesterId: "user_09",
      requesterName: "박제보",
      requesterEmail: "park@gm.gist.ac.kr",
    });
    expect(calls[0]).toMatchObject({
      method: "POST",
      path: "/signage/submissions/sub_09/reveal-author",
    });
  });

  it("최근 제보는 limit을 보내고 공개 필드만 읽는다", async () => {
    const { repository, calls } = fakeClient({
      items: [
        {
          storyNumber: 128,
          tag: "LOST_FOUND",
          body: "A동 로비에서 파란 우산을 주웠어요.",
          startAt: "2026-11-01T03:00:00.000Z",
        },
      ],
    });

    await expect(repository.listRecentStories({ limit: 3 })).resolves.toEqual([
      {
        storyNumber: 128,
        tag: "LOST_FOUND",
        body: "A동 로비에서 파란 우산을 주웠어요.",
        startAt: new Date("2026-11-01T03:00:00.000Z"),
      },
    ]);
    expect(calls[0]).toMatchObject({
      path: "/signage/stories/recent",
      query: { limit: 3 },
    });
  });
});
