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

  it("재검토 요청과 취소는 버전을 싣는다", async () => {
    const { repository, calls } = fakeClient(SUBMISSION);

    await repository.submit(
      "sub_01",
      { version: 2 },
      { idempotencyKey: "key-1" },
    );
    await repository.cancel("sub_01", { version: 3 });

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
});
