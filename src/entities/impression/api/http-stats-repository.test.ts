import { describe, expect, it, vi } from "vitest";
import type { HttpClient, HttpRequest } from "@/shared/api/http-client";
import { createHttpStatsRepository } from "./http-stats-repository";

/** Swagger `ImpressionStatsDto` 예시 모양 */
const STATS = {
  from: "2026-09-23",
  to: "2026-09-29",
  aggregatedAt: "2026-09-29T04:00:00.000Z",
  items: [
    {
      submissionId: "sub_01",
      title: "겨울 정기 공연",
      impressions: 1840,
      completedImpressions: 1795,
      deviceCount: 3,
    },
  ],
};

function fakeClient(response: unknown) {
  const calls: HttpRequest[] = [];
  const client: HttpClient = {
    request: vi.fn(async (call: HttpRequest) => {
      calls.push(call);
      return response;
    }) as HttpClient["request"],
  };
  return { repository: createHttpStatsRepository(client), calls };
}

describe("createHttpStatsRepository", () => {
  it("기간과 범위를 query로 보내고 응답을 읽는다", async () => {
    const { repository, calls } = fakeClient(STATS);

    const stats = await repository.getImpressions({
      from: "2026-09-23",
      to: "2026-09-29",
      scope: "all",
    });

    expect(calls[0]).toMatchObject({
      path: "/signage/stats/impressions",
      query: { from: "2026-09-23", to: "2026-09-29", scope: "all" },
    });
    expect(stats).toEqual({
      from: "2026-09-23",
      to: "2026-09-29",
      aggregatedAt: new Date("2026-09-29T04:00:00.000Z"),
      items: [
        {
          submissionId: "sub_01",
          title: "겨울 정기 공연",
          impressions: 1840,
          completedImpressions: 1795,
          deviceCount: 3,
        },
      ],
    });
  });

  it("범위를 비우면 내 게시물(me)로 묻는다", async () => {
    const { repository, calls } = fakeClient(STATS);

    await repository.getImpressions({});

    expect(calls[0]!.query).toMatchObject({ scope: "me" });
  });

  it("집계가 한 번도 돌지 않았으면 기준 시각이 null이다", async () => {
    const { repository } = fakeClient({ ...STATS, aggregatedAt: null });

    const stats = await repository.getImpressions({});

    expect(stats.aggregatedAt).toBeNull();
  });

  it("항목 모양이 틀리면 응답 오류로 멈춘다", async () => {
    const { repository } = fakeClient({
      ...STATS,
      items: [{ ...STATS.items[0], impressions: "1840" }],
    });

    await expect(repository.getImpressions({})).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});
