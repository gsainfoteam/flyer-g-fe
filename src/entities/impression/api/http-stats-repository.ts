import type { HttpClient } from "@/shared/api/http-client";
import {
  readArray,
  readIsoDate,
  readNumber,
  readObject,
  readString,
} from "@/shared/api/parse";
import type { StatsRepository } from "@/shared/api/repositories";
import type { ImpressionStatsItem } from "../model/types";

/**
 * 노출 통계의 실제 구현.
 *
 * | 메서드 | 경로 | 권한 |
 * |---|---|---|
 * | getImpressions | `GET /signage/stats/impressions?from=&to=&scope=` | me는 누구나, all은 검토자 이상 |
 *
 * 날짜는 서울 기준 하루 단위이고 `from`·`to` 모두 포함한다. 기간을 비우면 서버가
 * 오늘까지 30일로 정한다. 묶는 기준(`groupBy`)은 지금 게시물 하나뿐이라 보내지 않는다.
 */
function parseItem(payload: unknown, index: number): ImpressionStatsItem {
  const path = `items[${index}]`;
  const body = readObject(payload, path);
  return {
    submissionId: readString(body, "submissionId", `${path}.submissionId`),
    title: readString(body, "title", `${path}.title`),
    impressions: readNumber(body, "impressions", `${path}.impressions`),
    completedImpressions: readNumber(
      body,
      "completedImpressions",
      `${path}.completedImpressions`,
    ),
    deviceCount: readNumber(body, "deviceCount", `${path}.deviceCount`),
  };
}

export function createHttpStatsRepository(client: HttpClient): StatsRepository {
  return {
    async getImpressions({ from, to, scope = "me" }, signal) {
      const body = readObject(
        await client.request({
          path: "/signage/stats/impressions",
          query: { from, to, scope },
          signal,
        }),
      );
      return {
        from: readString(body, "from"),
        to: readString(body, "to"),
        // 집계가 한 번도 돌지 않았으면 null이다.
        aggregatedAt:
          body.aggregatedAt === null || body.aggregatedAt === undefined
            ? null
            : readIsoDate(body, "aggregatedAt"),
        items: readArray(body.items, "items").map(parseItem),
      };
    },
  };
}
