import { useQuery } from "@tanstack/react-query";
import { useRepositories } from "@/shared/api/repositories-context";
import { queryKeys } from "@/shared/api/query-keys";
import type { ImpressionStatsParams } from "../model/types";

/** 서버는 10분마다 모은다. 그보다 자주 다시 묻지 않는다. */
const STATS_STALE_MS = 5 * 60_000;

/** 기간 안의 게시물별 노출. `scope: "all"`은 검토자만 부른다. */
export function useImpressionStats(
  params: ImpressionStatsParams,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { stats } = useRepositories();

  return useQuery({
    queryKey: queryKeys.stats.impressions(params),
    enabled,
    staleTime: STATS_STALE_MS,
    queryFn: ({ signal }) => stats.getImpressions(params, signal),
  });
}
