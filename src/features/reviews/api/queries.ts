import { useQuery } from "@tanstack/react-query";
import { toSubmissionView } from "@/entities/submission";
import type { SubmissionView } from "@/entities/submission/model/types";
import { useRepositories } from "@/app/providers/repositories-context";
import { queryKeys } from "@/shared/api/query-keys";

/**
 * 승인 대기 목록 조회.
 * 승인·반려 mutation과 충돌 처리는 Phase 04 범위다.
 */
export function usePendingReviews(
  limit = 5,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { reviews } = useRepositories();

  return useQuery({
    queryKey: queryKeys.reviews.pending({ limit }),
    // 검토 권한이 없는 세션에서는 부르지 않는다. 서버는 403을 준다.
    enabled,
    queryFn: ({ signal }) => reviews.listPending({ limit }, signal),
    select: (
      page,
    ): { items: SubmissionView[]; totalCount: number; serverTime: Date } => ({
      items: page.items.map((item) => toSubmissionView(item, page.serverTime)),
      totalCount: page.totalCount,
      serverTime: page.serverTime,
    }),
  });
}
