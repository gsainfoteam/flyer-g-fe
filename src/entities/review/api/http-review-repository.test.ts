import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/error";
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
                // 게시 시작·종료는 서버 작업이 남긴다. 사람 이름을 붙이지 않는다.
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
      ["PUBLISHED", "", "log_04"],
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

  describe("최근 처리", () => {
    const decisionLogs = [
      log("log_09", "SUBMISSION_UPDATED", "2026-09-27T09:00:00.000Z"),
      log("log_08", "SUBMISSION_REJECTED", "2026-09-27T08:00:00.000Z", {
        actorName: "김관리",
        targetId: "sub_01",
        targetTitle: "겨울 정기 공연",
      }),
      log("log_07", "SUBMISSION_PUBLISHED", "2026-09-27T07:00:00.000Z", {
        actorType: "SYSTEM",
        actorName: null,
      }),
      log("log_06", "SUBMISSION_APPROVED", "2026-09-27T06:00:00.000Z", {
        actorName: "이관리",
        targetId: "sub_02",
      }),
      log("log_05", "SUBMISSION_SUSPENDED", "2026-09-27T05:00:00.000Z", {
        actorName: "김관리",
        targetId: "sub_03",
      }),
    ];

    it("검토 결정만 골라 최신순으로 limit만큼 준다", async () => {
      const { repository, calls } = fakeClient({
        "/signage/audit-logs": () => page(decisionLogs),
        "/signage/submissions/sub_02": () => {
          throw new Error("제목이 없을 때만 부른다");
        },
      });

      const records = await repository
        .listRecentDecisions({ limit: 1 })
        .catch((error: unknown) => error);

      expect(records).toEqual([
        {
          id: "log_08",
          submissionId: "sub_01",
          submissionTitle: "겨울 정기 공연",
          decision: "REJECTED",
          actorName: "김관리",
          occurredAt: new Date("2026-09-27T08:00:00.000Z"),
        },
      ]);
      // 지금 action은 값 하나만 받는다. 한 페이지를 받아 거른다.
      expect(calls[0]!.query).toEqual({ targetType: "SUBMISSION", limit: 100 });
    });

    it("로그에 제목이 없으면 신청을 불러 채우고, 지워진 신청은 제목 없이 둔다", async () => {
      const { repository } = fakeClient({
        "/signage/audit-logs": () => page(decisionLogs),
        "/signage/submissions/sub_02": () => ({
          id: "sub_02",
          ziggleNoticeId: null,
          requesterId: "user_09",
          requesterName: "박신청",
          type: "POSTER",
          title: "봄 버스킹",
          categoryId: "performance",
          categoryName: "공연",
          assetId: "asset_02",
          posterUrl: "https://cdn.example/p.webp",
          posterThumbUrl: "https://cdn.example/t.webp",
          detailUrl: null,
          startAt: "2026-09-28T00:00:00.000Z",
          endAt: "2026-10-05T00:00:00.000Z",
          status: "SCHEDULED",
          priority: 0,
          targetGroupIds: [],
          organizerName: null,
          subtitle: null,
          location: null,
          description: null,
          version: 2,
          submittedAt: "2026-09-26T00:00:00.000Z",
          createdAt: "2026-09-26T00:00:00.000Z",
          updatedAt: "2026-09-27T06:00:00.000Z",
        }),
        "/signage/submissions/sub_03": () => {
          throw new ApiError({
            kind: "http",
            code: "NOT_FOUND",
            message: "없음",
            status: 404,
          });
        },
      });

      const records = await repository.listRecentDecisions({ limit: 3 });

      expect(
        records.map((record) => [record.decision, record.submissionTitle]),
      ).toEqual([
        ["REJECTED", "겨울 정기 공연"],
        ["APPROVED", "봄 버스킹"],
        ["SUSPENDED", null],
      ]);
    });

    const failWith =
      (init: ConstructorParameters<typeof ApiError>[0]) => () => {
        throw new ApiError(init);
      };

    it("제목 조회가 실패해도 이미 받은 기록은 버리지 않고 제목만 비운다", async () => {
      const { repository } = fakeClient({
        "/signage/audit-logs": () => page(decisionLogs),
        "/signage/submissions/sub_02": failWith({
          kind: "http",
          code: "SERVER_ERROR",
          message: "서버 오류",
          status: 500,
        }),
        "/signage/submissions/sub_03": failWith({
          kind: "timeout",
          code: "TIMEOUT",
          message: "시간 초과",
        }),
      });

      const records = await repository.listRecentDecisions({ limit: 3 });

      expect(
        records.map((record) => [record.decision, record.submissionTitle]),
      ).toEqual([
        ["REJECTED", "겨울 정기 공연"],
        ["APPROVED", null],
        ["SUSPENDED", null],
      ]);
    });

    it("요청 취소와 세션 만료(401)는 그대로 알린다", async () => {
      const canceled = fakeClient({
        "/signage/audit-logs": () => page(decisionLogs),
        "/signage/submissions/sub_02": failWith({
          kind: "canceled",
          code: "REQUEST_CANCELED",
          message: "취소",
        }),
        "/signage/submissions/sub_03": () => {
          throw new Error("취소되면 결과를 쓰지 않는다");
        },
      });
      await expect(
        canceled.repository.listRecentDecisions({ limit: 3 }),
      ).rejects.toMatchObject({ kind: "canceled" });

      const expired = fakeClient({
        "/signage/audit-logs": () => page(decisionLogs),
        "/signage/submissions/sub_02": failWith({
          kind: "http",
          code: "UNAUTHENTICATED",
          message: "로그인 필요",
          status: 401,
        }),
        "/signage/submissions/sub_03": failWith({
          kind: "http",
          code: "NOT_FOUND",
          message: "없음",
          status: 404,
        }),
      });
      await expect(
        expired.repository.listRecentDecisions({ limit: 3 }),
      ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    });
  });
});
