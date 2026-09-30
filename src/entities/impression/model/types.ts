import { toSeoulDateInputValue } from "@/shared/lib/datetime";

/**
 * 노출 통계 (`GET /signage/stats/impressions`).
 *
 * 노출은 **디스플레이가 포스터를 정상으로 띄운 횟수**다. 사람이 본 횟수가 아니다.
 * 화면에 숫자를 보여줄 때는 이 뜻을 함께 적는다.
 *
 * 서버는 10분마다 모아서 센다. `aggregatedAt` 뒤에 들어온 기록은 아직 빠져 있다.
 */
export interface ImpressionStatsItem {
  submissionId: string;
  title: string;
  /** 정상으로 띄운 횟수 */
  impressions: number;
  /** 그중 전환 간격을 끝까지 채운 횟수 */
  completedImpressions: number;
  /** 기간 안에 한 번이라도 띄운 기기 수 */
  deviceCount: number;
}

export interface ImpressionStats {
  /** 시작 날짜(서울, 포함). "2026-09-23" */
  from: string;
  /** 끝 날짜(서울, 포함) */
  to: string;
  /** 마지막으로 모은 시각. 한 번도 모으지 않았으면 null */
  aggregatedAt: Date | null;
  /** 노출이 많은 순. 기간 안에 노출이 없는 게시물은 없다. */
  items: ImpressionStatsItem[];
}

export interface ImpressionStatsParams {
  /** 시작 날짜(서울, 포함). 비우면 서버 기본(끝 날짜의 29일 전) */
  from?: string;
  /** 끝 날짜(서울, 포함). 비우면 오늘 */
  to?: string;
  /** me: 내 게시물(기본). all: 전체, 검토자만(아니면 403) */
  scope?: "me" | "all";
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 오늘까지 `days`일의 조회 기간. 날짜는 서울 기준이다.
 * `today`는 서버 시각을 넘긴다. 클라이언트 시계로 날짜를 정하지 않는다.
 * (서울에는 서머타임이 없어 하루를 24시간으로 빼도 된다.)
 */
export function impressionRange(
  days: number,
  today: Date,
): Required<Pick<ImpressionStatsParams, "from" | "to">> {
  return {
    from: toSeoulDateInputValue(new Date(today.getTime() - (days - 1) * DAY_MS)),
    to: toSeoulDateInputValue(today),
  };
}

/** 게시물 하나의 노출을 id로 찾는다. 기간 안에 노출이 없으면 없다. */
export function indexImpressions(
  stats: ImpressionStats | undefined,
): Map<string, ImpressionStatsItem> {
  return new Map(stats?.items.map((item) => [item.submissionId, item]) ?? []);
}

/** 여러 게시물의 합계. 끝까지 나온 비율은 노출이 없으면 null이다. */
export function totalImpressions(items: readonly ImpressionStatsItem[]): {
  impressions: number;
  completionRate: number | null;
} {
  const impressions = items.reduce((sum, item) => sum + item.impressions, 0);
  const completed = items.reduce(
    (sum, item) => sum + item.completedImpressions,
    0,
  );
  return {
    impressions,
    completionRate: impressions > 0 ? completed / impressions : null,
  };
}
