import { describe, expect, it, vi } from "vitest";
import type { HttpClient, HttpRequest } from "@/shared/api/http-client";
import { createHttpReviewRepository } from "./http-review-repository";

type Handler = (request: HttpRequest) => unknown;

function fakeClient(handlers: Record<string, Handler>) {
  const calls: HttpRequest[] = [];
  const client: HttpClient = {
    request: vi.fn(async (request: HttpRequest) => {
      calls.push(request);
      const handler = handlers[request.path];
      if (!handler) throw new Error(`예상하지 못한 요청: ${request.path}`);
      return handler(request);
    }) as HttpClient["request"],
  };
  return { repository: createHttpReviewRepository(client), calls };
}

const log = (
  id: string,
  action: string,
  createdAt: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  actorType: "USER",
  actorId: "user_01",
  actorName: "홍길동",
  action,
  targetType: "SUBMISSION",
  targetId: "sub_01",
  reason: null,
  metadata: null,
  createdAt,
  requestId: "req",
  ...extra,
});

const page = (items: unknown[], nextCursor: string | null = null) => ({
  items,
  nextCursor,
  totalCount: items.length,
  serverTime: "2026-09-27T10:00:00.000Z",
});

describe("createHttpReviewRepository", () => {
  it("승인 대기 목록은 검토 대기만 카테고리로 걸러 받는다", async () => {
    const { repository, calls } = fakeClient({
      "/signage/reviews": () => page([]),
    });

    await repository.listPending({
      categoryId: "club",
      limit: 20,
      cursor: "c1",
    });

    expect(calls[0]!.query).toEqual({
      status: "PENDING_REVIEW",
      categoryId: "club",
      cursor: "c1",
      limit: 20,
    });
  });

  it("승인은 검토한 버전과 idempotency key를 싣는다", async () => {
    const { repository, calls } = fakeClient({
      "/signage/submissions/sub_01/approve": () => {
        throw new Error("응답 모양은 신청 repository 테스트에서 본다");
      },
    });

    await repository
      .approve(
        { submissionId: "sub_01", revision: 3 },
        { idempotencyKey: "key-1" },
      )
      .catch(() => undefined);

    expect(calls[0]).toMatchObject({
      method: "POST",
      body: { revision: 3 },
      idempotencyKey: "key-1",
    });
  });

  it("처리 이력은 검토 결정과 게시자 행동을 합쳐 시간 순으로 준다", async () => {
    const { repository, calls } = fakeClient({
      "/signage/submissions/sub_01/reviews": () => [
        {
          id: "rev_01",
          submissionId: "sub_01",
          revision: 1,
          decision: "REJECTED",
          reasonCode: "LOW_RESOLUTION",
          comment: "해상도가 낮아요",
          reviewerId: "user_02",
          reviewerName: "김관리",
          reviewedAt: "2026-09-26T02:00:00.000Z",
        },
      ],
      // 감사 로그는 최신순이고 페이지로 나뉘어 온다.
      "/signage/audit-logs": (request) =>
        request.query?.cursor === "next"
          ? page([
              log("log_01", "SUBMISSION_CREATED", "2026-09-25T01:00:00.000Z"),
            ])
          : page(
              [
                log(
                  "log_05",
                  "SUBMISSION_CANCELED",
                  "2026-09-27T05:00:00.000Z",
                  {
                    actorName: null,
                  },
                ),
                // 시스템 전이와 검토 결정은 이력에 다시 넣지 않는다.
                log(
                  "log_04",
                  "SUBMISSION_PUBLISHED",
                  "2026-09-27T04:00:00.000Z",
                  {
                    actorType: "SYSTEM",
                    actorId: null,
                    actorName: null,
                  },
                ),
                log(
                  "log_03",
                  "SUBMISSION_RESUBMITTED",
                  "2026-09-26T03:00:00.000Z",
                  {
                    metadata: {},
                  },
                ),
                // 반려 상태에서 고친 것은 상태가 그대로라 이력에 없다.
                log(
                  "log_02",
                  "SUBMISSION_UPDATED",
                  "2026-09-26T02:30:00.000Z",
                  {
                    metadata: { fromStatus: "REJECTED", toStatus: "REJECTED" },
                  },
                ),
                log(
                  "log_00",
                  "SUBMISSION_REJECTED",
                  "2026-09-26T02:00:00.000Z",
                ),
              ],
              "next",
            ),
    });

    const history = await repository.listHistory("sub_01");

    expect(
      history.map((event) => [event.type, event.actorName, event.id]),
    ).toEqual([
      ["SUBMITTED", "홍길동", "log_01"],
      ["REJECTED", "김관리", "rev_01"],
      ["RESUBMITTED", "홍길동", "log_03"],
      // 탈퇴한 사용자는 이름이 없다.
      ["CANCELED", "알 수 없음", "log_05"],
    ]);
    expect(history[1]).toMatchObject({
      reasonCode: "LOW_RESOLUTION",
      comment: "해상도가 낮아요",
      revision: 1,
    });
    expect(
      calls
        .filter((call) => call.path === "/signage/audit-logs")
        .map((call) => call.query),
    ).toEqual([
      {
        targetType: "SUBMISSION",
        targetId: "sub_01",
        limit: 100,
        cursor: null,
      },
      {
        targetType: "SUBMISSION",
        targetId: "sub_01",
        limit: 100,
        cursor: "next",
      },
    ]);
  });

  it("예약 건을 고쳐 다시 승인을 받게 된 것도 다시 신청으로 남긴다", async () => {
    const { repository } = fakeClient({
      "/signage/submissions/sub_01/reviews": () => [],
      "/signage/audit-logs": () =>
        page([
          log("log_02", "SUBMISSION_UPDATED", "2026-09-27T01:00:00.000Z", {
            metadata: { fromStatus: "SCHEDULED", toStatus: "PENDING_REVIEW" },
          }),
        ]),
    });

    const [event] = await repository.listHistory("sub_01");

    expect(event).toMatchObject({ type: "RESUBMITTED", revision: null });
  });

  it("모르는 검토 결정이 오면 INVALID_RESPONSE로 멈춘다", async () => {
    const { repository } = fakeClient({
      "/signage/submissions/sub_01/reviews": () => [
        {
          id: "rev_01",
          submissionId: "sub_01",
          revision: 1,
          decision: "ESCALATED",
          reasonCode: null,
          comment: null,
          reviewerId: "user_02",
          reviewerName: "김관리",
          reviewedAt: "2026-09-26T02:00:00.000Z",
        },
      ],
      "/signage/audit-logs": () => page([]),
    });

    await expect(repository.listHistory("sub_01")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});
